import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { OpenAttendanceSessionSchema } from "@/lib/schemas";
import { signQrToken } from "@/lib/auth/jwt";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import QRCode from "qrcode";

// ─── GET /api/attendance/sessions — List sessions ────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.INSTRUCTOR);
    const { searchParams } = req.nextUrl;

    const scheduleId = searchParams.get("scheduleId")
      ? parseInt(searchParams.get("scheduleId")!, 10)
      : undefined;
    const status = searchParams.get("status") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const skip = (page - 1) * limit;

    // Instructors see only their own classes; Admin sees all
    const instructorFilter =
      user.role === ROLES.INSTRUCTOR
        ? {
            Schedule: {
              Class: {
                ClassAssignments: {
                  some: {
                    Instructor: { UserId: user.userId },
                    RemovedAt: null,
                  },
                },
              },
            },
          }
        : {};

    const where = {
      ...instructorFilter,
      ...(scheduleId && { ScheduleId: scheduleId }),
      ...(status && { Status: status }),
    };

    const [total, sessions] = await prisma.$transaction([
      prisma.t_AttendanceSession.count({ where }),
      prisma.t_AttendanceSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { CreatedAt: "desc" },
        include: {
          Schedule: {
            include: {
              Class: {
                include: {
                  Subject: { select: { SubjectCode: true, SubjectName: true } },
                },
              },
              Room: { select: { RoomCode: true, RoomName: true } },
            },
          },
          _count: { select: { AttendanceRecords: true } },
        },
      }),
    ]);

    return applySecurityHeaders(
      NextResponse.json({
        data: sessions,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Sessions GET] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

// ─── POST /api/attendance/sessions — Open attendance session ─────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.INSTRUCTOR);
    const body = await req.json();

    const parsed = OpenAttendanceSessionSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { ScheduleId, SessionDate, Method, AutoCloseMinutes } = parsed.data;

    // Verify schedule exists and belongs to requesting instructor
    const schedule = await prisma.mT_Schedule.findFirst({
      where: {
        ScheduleId,
        IsActive: true,
        ...(user.role === ROLES.INSTRUCTOR && {
          Class: {
            ClassAssignments: {
              some: {
                Instructor: { UserId: user.userId },
                RemovedAt: null,
              },
            },
          },
        }),
      },
    });

    if (!schedule) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "SCHEDULE_NOT_FOUND", message: "Schedule not found or not assigned to you" },
          { status: 404 }
        )
      );
    }

    // Check for duplicate session on same date
    const existing = await prisma.t_AttendanceSession.findFirst({
      where: {
        ScheduleId,
        SessionDate: new Date(SessionDate),
        Status: { notIn: ["CANCELLED"] },
      },
    });

    if (existing) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "SESSION_EXISTS", message: "A session already exists for this schedule on this date" },
          { status: 409 }
        )
      );
    }

    // Generate QR token if method requires it
    let qrExpiresAt: Date | null = null;
    let qrCodeDataUrl: string | null = null;

    if (Method === "QR" || Method === "BOTH") {
      const expiryMinutes = parseInt(process.env.QR_TOKEN_EXPIRY_MINUTES ?? "5", 10);
      qrExpiresAt = new Date(Date.now() + expiryMinutes * 60000);
    }

    const autoCloseAt = AutoCloseMinutes
      ? new Date(Date.now() + AutoCloseMinutes * 60000)
      : null;

    const session = await prisma.t_AttendanceSession.create({
      data: {
        ScheduleId,
        SessionDate: new Date(SessionDate),
        OpenedAt: new Date(),
        Status: "OPEN",
        Method,
        AutoCloseAt: autoCloseAt,
        QrExpiresAt: qrExpiresAt,
      },
      include: {
        Schedule: {
          include: {
            Class: {
              include: { Subject: true },
            },
          },
        },
      },
    });

    // Now generate real QR token with actual session ID
    if (Method === "QR" || Method === "BOTH") {
      const realQrToken = await signQrToken(session.SessionId);
      const expiryMinutes = parseInt(process.env.QR_TOKEN_EXPIRY_MINUTES ?? "5", 10);
      qrExpiresAt = new Date(Date.now() + expiryMinutes * 60000);

      await prisma.t_AttendanceSession.update({
        where: { SessionId: session.SessionId },
        data: { QrCodeToken: realQrToken, QrExpiresAt: qrExpiresAt },
      });

      // Generate QR code data URL
      qrCodeDataUrl = await QRCode.toDataURL(realQrToken, {
        width: 300,
        margin: 2,
        color: { dark: "#1e293b", light: "#ffffff" },
      });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "ATTENDANCE_SESSION_OPENED",
      entityType: "T_AttendanceSession",
      entityId: session.SessionId,
      newValues: { ScheduleId, SessionDate, Method },
      ipAddress: ip,
    });

    return applySecurityHeaders(
      NextResponse.json(
        {
          success: true,
          data: {
            ...session,
            QrCodeDataUrl: qrCodeDataUrl,
          },
        },
        { status: 201 }
      )
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Sessions POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
