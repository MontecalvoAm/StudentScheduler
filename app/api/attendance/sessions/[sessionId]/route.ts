import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

// ─── PATCH /api/attendance/sessions/[sessionId] ──────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireRole(req, ROLES.INSTRUCTOR);
    const { sessionId } = await params;
    const body = await req.json();
    const { status } = body; // CLOSED | CANCELLED

    if (status !== "CLOSED" && status !== "CANCELLED") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "INVALID_STATUS", message: "Status must be CLOSED or CANCELLED" },
          { status: 400 }
        )
      );
    }

    const sId = parseInt(sessionId, 10);
    if (isNaN(sId)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INVALID_SESSION_ID" }, { status: 400 })
      );
    }

    // Verify session exists and belongs to instructor
    const session = await prisma.sched_AttendanceSessions.findFirst({
      where: {
        SessionId: sId,
        ...(user.role === ROLES.INSTRUCTOR && {
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
        }),
      },
    });

    if (!session) {
      return applySecurityHeaders(
        NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 })
      );
    }

    const updated = await prisma.sched_AttendanceSessions.update({
      where: { SessionId: sId },
      data: {
        Status: status,
        ...(status === "CLOSED" && { ClosedAt: new Date() }),
      },
    });

    // Audit log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: status === "CLOSED" ? "ATTENDANCE_SESSION_CLOSED" : "ATTENDANCE_SESSION_CANCELLED",
      entityType: "sched_AttendanceSessions",
      entityId: updated.SessionId,
      newValues: { Status: status },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, data: updated }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Session PATCH] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
