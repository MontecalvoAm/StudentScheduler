import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError , requirePermission } from "@/lib/auth/rbac";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import { UpdateUserSchema } from "@/lib/schemas";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";

// ─── PATCH /api/users/[userToken] — Edit User ──────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userToken: string }> }
) {
  try {
    const user = await requirePermission(req, "users", "CanUpdate");
    const { userToken } = await params;
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

    if (!userToken) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INVALID_USER_TOKEN" }, { status: 400 })
      );
    }

    const { Email, FirstName, LastName, RoleId, IsActive, IsLocked, Password, CourseToken, YearLevel, Section, StudySession, DepartmentToken, StudentNumber, EmployeeNumber } = parsed.data;

    let passwordHash: string | undefined = undefined;
    if (Password) {
      const { valid, errors } = validatePasswordStrength(Password);
      if (!valid) {
        return applySecurityHeaders(
          NextResponse.json({ error: "WEAK_PASSWORD", message: errors.join(", ") }, { status: 400 })
        );
      }
      passwordHash = await hashPassword(Password);
    }

    // Fetch existing user to check and log changes
    const existing = await prisma.m_User.findUnique({
      where: { UserToken: userToken },
      include: { Role: true }
    });

    if (!existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 })
      );
    }

    // Prevent self locking or self disabling
    if (existing.UserId === user.userId && (IsActive === false || IsLocked === true)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "SELF_MUTATION_DENIED", message: "You cannot lock or deactivate your own account" },
          { status: 400 }
        )
      );
    }

    const targetUserId = existing.UserId;

    // Update user and profile in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.m_User.update({
        where: { UserId: targetUserId },
        data: {
          ...(Email && { Email }),
          ...(FirstName && { FirstName }),
          ...(LastName && { LastName }),
          ...(RoleId && { RoleId }),
          ...(IsActive !== undefined && { IsActive }),
          ...(IsLocked !== undefined && {
            IsLocked,
            ...(IsLocked === false && { FailedLoginCount: 0, LockedUntil: null }),
          }),
          ...(passwordHash && { PasswordHash: passwordHash }),
        },
      });

      // Get the target role details
      let targetRole = existing.Role;
      if (RoleId && RoleId !== existing.RoleId) {
        const dbRole = await tx.m_Role.findUnique({
          where: { RoleId }
        });
        if (dbRole) targetRole = dbRole;
      }

      // If role transitioned, clean up old relation and create new one!
      if (targetRole.RoleName !== existing.Role.RoleName) {
        // Remove old profile
        if (existing.Role.RoleName === ROLES.STUDENT) {
          await tx.m_Student.deleteMany({ where: { UserId: targetUserId } });
        } else if (existing.Role.RoleName === ROLES.INSTRUCTOR) {
          await tx.m_Instructor.deleteMany({ where: { UserId: targetUserId } });
        }

        // Initialize new profile
        if (targetRole.RoleName === ROLES.STUDENT) {
          let internalCourseId: number | null = null;
          if (CourseToken) {
            const course = await tx.m_Course.findUnique({ where: { CourseToken } });
            if (course) internalCourseId = course.CourseId;
          }
          await tx.m_Student.create({
            data: {
              UserId: targetUserId,
              StudentNumber: StudentNumber || `TEMP-${Date.now()}`,
              CourseId: internalCourseId,
              YearLevel: YearLevel ? parseInt(YearLevel as any, 10) : null,
              Section: Section || null,
              StudySession: StudySession || null,
            }
          });
        } else if (targetRole.RoleName === ROLES.INSTRUCTOR) {
          let internalDeptId: number | null = null;
          if (DepartmentToken) {
            const dept = await tx.m_Department.findUnique({ where: { DepartmentToken } });
            if (dept) internalDeptId = dept.DepartmentId;
          }
          await tx.m_Instructor.create({
            data: {
              UserId: targetUserId,
              EmployeeNumber: EmployeeNumber || `TEMP-EMP-${Date.now()}`,
              DepartmentId: internalDeptId,
            }
          });
        }
      } else {
        // Role is same, perform normal profile updates
        if (targetRole.RoleName === ROLES.STUDENT) {
          let internalCourseId: number | null | undefined = undefined;
          if (CourseToken !== undefined) {
            if (CourseToken === null) {
              internalCourseId = null;
            } else {
              const course = await tx.m_Course.findUnique({ where: { CourseToken } });
              if (course) internalCourseId = course.CourseId;
            }
          }

          const currentStudent = await tx.m_Student.findUnique({ where: { UserId: targetUserId } });
          if (!currentStudent) {
            await tx.m_Student.create({
              data: {
                UserId: targetUserId,
                StudentNumber: StudentNumber || `TEMP-${Date.now()}`,
                CourseId: internalCourseId ?? null,
                YearLevel: YearLevel ? parseInt(YearLevel as any, 10) : null,
                Section: Section || null,
                StudySession: StudySession || null,
              }
            });
          } else {
            await tx.m_Student.update({
              where: { UserId: targetUserId },
              data: {
                ...(StudentNumber !== undefined && { StudentNumber: StudentNumber ?? undefined }),
                ...(internalCourseId !== undefined && { CourseId: internalCourseId }),
                ...(YearLevel !== undefined && { YearLevel }),
                ...(Section !== undefined && { Section }),
                ...(StudySession !== undefined && { StudySession }),
              }
            });
          }
        } else if (targetRole.RoleName === ROLES.INSTRUCTOR) {
          let internalDeptId: number | null | undefined = undefined;
          if (DepartmentToken !== undefined) {
            if (DepartmentToken === null) {
              internalDeptId = null;
            } else {
              const dept = await tx.m_Department.findUnique({ where: { DepartmentToken } });
              if (dept) internalDeptId = dept.DepartmentId;
            }
          }
          const currentInstructor = await tx.m_Instructor.findUnique({ where: { UserId: targetUserId } });
          if (!currentInstructor) {
            await tx.m_Instructor.create({
              data: {
                UserId: targetUserId,
                EmployeeNumber: EmployeeNumber || `TEMP-EMP-${Date.now()}`,
                DepartmentId: internalDeptId ?? null,
              }
            });
          } else {
            await tx.m_Instructor.update({
              where: { UserId: targetUserId },
              data: {
                ...(EmployeeNumber !== undefined && { EmployeeNumber: EmployeeNumber ?? undefined }),
                ...(internalDeptId !== undefined && { DepartmentId: internalDeptId }),
              }
            });
          }
        }
      }

      return u;
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "USER_UPDATED",
      entityType: "M_User",
      entityId: targetUserId.toString(),
      oldValues: {
        Email: existing.Email,
        FirstName: existing.FirstName,
        LastName: existing.LastName,
        RoleId: existing.RoleId,
        IsActive: existing.IsActive,
        IsLocked: existing.IsLocked,
      },
      newValues: { Email, FirstName, LastName, RoleId, IsActive, IsLocked, CourseToken, YearLevel, Section, StudySession, DepartmentToken },
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

// ─── DELETE /api/users/[userToken] — Soft Delete User ──────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userToken: string }> }
) {
  try {
    const user = await requirePermission(req, "users", "CanDelete");
    const { userToken } = await params;

    if (!userToken) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INVALID_USER_TOKEN" }, { status: 400 })
      );
    }

    const existing = await prisma.m_User.findUnique({
      where: { UserToken: userToken, DeletedAt: null },
    });

    if (!existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 })
      );
    }

    // Prevent self deletion
    if (existing.UserId === user.userId) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "SELF_DELETION_DENIED", message: "You cannot delete your own account" },
          { status: 400 }
        )
      );
    }

    const targetUserId = existing.UserId;

    await prisma.m_User.update({
      where: { UserId: targetUserId },
      data: { DeletedAt: new Date(), IsActive: false },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "USER_DELETED",
      entityType: "M_User",
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
