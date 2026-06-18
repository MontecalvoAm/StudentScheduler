import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { MarkAttendanceSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

// ─── POST /api/attendance/mark — Student marks via button ────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.STUDENT);
    const body = await req.json();

    const parsed = MarkAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { SessionId } = parsed.data;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    // Get student profile
    const student = await prisma.m_Student.findFirst({
      where: { UserId: user.userId, DeletedAt: null },
    });
    if (!student) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "STUDENT_NOT_FOUND", message: "Student profile not found" },
          { status: 404 }
        )
      );
    }

    return await markAttendance({
      sessionId: SessionId,
      studentId: student.StudentId,
      markedByUserId: user.userId,
      method: "BUTTON",
      ip,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Mark Attendance] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

// ─── Shared attendance marking logic ─────────────────────────────────────────
async function markAttendance({
  sessionId,
  studentId,
  markedByUserId,
  method,
  ip,
}: {
  sessionId: number;
  studentId: number;
  markedByUserId: number;
  method: string;
  ip: string | null;
}): Promise<NextResponse> {
  // 1. Verify session is OPEN and supports this method
  const session = await prisma.t_AttendanceSession.findFirst({
    where: {
      SessionId: sessionId,
      Status: "OPEN",
    },
    include: {
      Schedule: {
        include: {
          Class: {
            include: {
              Enrollments: {
                where: { StudentId: studentId, Status: "ACTIVE" },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "SESSION_NOT_OPEN", message: "Attendance session is not open" },
        { status: 400 }
      )
    );
  }

  // 2. Check method compatibility
  if (method === "BUTTON" && session.Method === "QR") {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "METHOD_NOT_ALLOWED", message: "This session requires QR code attendance" },
        { status: 400 }
      )
    );
  }

  // 3. Check auto-close
  if (session.AutoCloseAt && session.AutoCloseAt < new Date()) {
    await prisma.t_AttendanceSession.update({
      where: { SessionId: sessionId },
      data: { Status: "CLOSED", ClosedAt: new Date() },
    });
    return applySecurityHeaders(
      NextResponse.json(
        { error: "SESSION_EXPIRED", message: "Attendance session has expired" },
        { status: 400 }
      )
    );
  }

  // 4. Verify student is enrolled in this class
  const isEnrolled = session.Schedule.Class.Enrollments.length > 0;
  if (!isEnrolled) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "NOT_ENROLLED", message: "You are not enrolled in this class" },
        { status: 403 }
      )
    );
  }

  // 5. Check for duplicate attendance
  const existing = await prisma.t_AttendanceRecord.findUnique({
    where: {
      SessionId_StudentId: { SessionId: sessionId, StudentId: studentId },
    },
  });

  if (existing) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "ALREADY_MARKED", message: "Attendance already marked for this session" },
        { status: 409 }
      )
    );
  }

  // 6. Determine status (PRESENT vs LATE based on schedule time)
  const now = new Date();
  const scheduleStartTime = session.Schedule.StartTime; // "HH:MM"
  const [hours, minutes] = scheduleStartTime.split(":").map(Number);
  const sessionStart = new Date(session.SessionDate);
  sessionStart.setHours(hours, minutes, 0, 0);

  // Late threshold: 15 minutes after scheduled start
  const LATE_THRESHOLD_MINUTES = 15;
  const lateTime = new Date(sessionStart.getTime() + LATE_THRESHOLD_MINUTES * 60000);
  const status = now > lateTime ? "LATE" : "PRESENT";

  // 7. Create immutable attendance record
  const record = await prisma.t_AttendanceRecord.create({
    data: {
      SessionId: sessionId,
      StudentId: studentId,
      Status: status,
      MarkedAt: now,
      MarkedByUserId: markedByUserId,
    },
  });

  await auditLog({
    userId: markedByUserId,
    action: "ATTENDANCE_MARKED",
    entityType: "T_AttendanceRecord",
    entityId: record.AttendanceRecordId,
    newValues: { SessionId: sessionId, StudentId: studentId, Status: status, Method: method },
    ipAddress: ip,
  });

  return applySecurityHeaders(
    NextResponse.json({
      success: true,
      data: {
        AttendanceRecordId: record.AttendanceRecordId,
        Status: record.Status,
        MarkedAt: record.MarkedAt,
      },
    })
  );
}
