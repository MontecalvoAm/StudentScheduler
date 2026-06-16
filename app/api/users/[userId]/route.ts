import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import { UpdateUserSchema } from "@/lib/schemas";

// ─── PATCH /api/users/[userId] — Edit User ──────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireRole(req, ROLES.SUPER_ADMIN);
    const { userId } = await params;
    const body = await req.json();

    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const targetUserId = parseInt(userId, 10);
    if (isNaN(targetUserId)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 })
      );
    }

    const { Email, FirstName, LastName, RoleId, IsActive, IsLocked, CourseId, YearLevel, Section, StudySession, Department } = parsed.data;

    // Fetch existing user to check and log changes
    const existing = await prisma.sched_Users.findUnique({
      where: { UserId: targetUserId },
      include: { Role: true }
    });

    if (!existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 })
      );
    }

    // Prevent self locking or self disabling
    if (targetUserId === user.userId && (IsActive === false || IsLocked === true)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "SELF_MUTATION_DENIED", message: "You cannot lock or deactivate your own account" },
          { status: 400 }
        )
      );
    }

    // Update user and profile in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.sched_Users.update({
        where: { UserId: targetUserId },
        data: {
          ...(Email && { Email }),
          ...(FirstName && { FirstName }),
          ...(LastName && { LastName }),
          ...(RoleId && { RoleId }),
          ...(IsActive !== undefined && { IsActive }),
          ...(IsLocked !== undefined && {
            IsLocked,
            // Reset login counts if unlocking
            ...(IsLocked === false && { FailedLoginCount: 0, LockedUntil: null }),
          }),
        },
      });

      // Handle Profile Updates
      if (existing.Role.RoleName === ROLES.STUDENT) {
        await tx.sched_Students.update({
          where: { UserId: targetUserId },
          data: {
            ...(CourseId !== undefined && { CourseId }),
            ...(YearLevel !== undefined && { YearLevel }),
            ...(Section !== undefined && { Section }),
            ...(StudySession !== undefined && { StudySession }),
          }
        });
      } else if (existing.Role.RoleName === ROLES.INSTRUCTOR) {
        await tx.sched_Instructors.update({
          where: { UserId: targetUserId },
          data: {
            ...(Department !== undefined && { Department }),
          }
        });
      }

      return u;
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "USER_UPDATED",
      entityType: "sched_Users",
      entityId: targetUserId.toString(),
      oldValues: {
        Email: existing.Email,
        FirstName: existing.FirstName,
        LastName: existing.LastName,
        RoleId: existing.RoleId,
        IsActive: existing.IsActive,
        IsLocked: existing.IsLocked,
      },
      newValues: { Email, FirstName, LastName, RoleId, IsActive, IsLocked, CourseId, YearLevel, Section, StudySession, Department },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, user: updated }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[User PATCH] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

// ─── DELETE /api/users/[userId] — Soft Delete User ──────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireRole(req, ROLES.SUPER_ADMIN);
    const { userId } = await params;

    const targetUserId = parseInt(userId, 10);
    if (isNaN(targetUserId)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 })
      );
    }

    // Prevent self deletion
    if (targetUserId === user.userId) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "SELF_DELETION_DENIED", message: "You cannot delete your own account" },
          { status: 400 }
        )
      );
    }

    const existing = await prisma.sched_Users.findUnique({
      where: { UserId: targetUserId, DeletedAt: null },
    });

    if (!existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 })
      );
    }

    await prisma.sched_Users.update({
      where: { UserId: targetUserId },
      data: { DeletedAt: new Date(), IsActive: false },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "USER_DELETED",
      entityType: "sched_Users",
      entityId: targetUserId.toString(),
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[User DELETE] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
