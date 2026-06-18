import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES , requirePermission } from "@/lib/auth/rbac";
import { AuthError } from "@/lib/auth/rbac";
import { CreateUserSchema, UserListQuerySchema } from "@/lib/schemas";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { auditLog, sanitizeForAudit } from "@/lib/audit-logger";
import { sendWelcomeEmail } from "@/lib/email";
import { applySecurityHeaders } from "@/lib/security/headers";
import crypto from "crypto";

// ─── GET /api/users — List users (Admin only) ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "users", "CanRead");
    const { searchParams } = req.nextUrl;

    const query = UserListQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (!query.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "VALIDATION_ERROR", issues: query.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { page, limit, search, roleToken, isActive, courseId, yearLevel, section, studySession, startDate, endDate } = query.data;
    const skip = (page - 1) * limit;

    const where = {
      DeletedAt: null,
      ...(search && {
        OR: [
          { FirstName: { contains: search } },
          { LastName: { contains: search } },
          { Email: { contains: search } },
        ],
      }),
      ...(roleToken && { Role: { RoleToken: roleToken } }),
      ...(isActive !== undefined && { IsActive: isActive }),
      ...((startDate || endDate) && {
        CreatedAt: {
          ...(startDate && { gte: startDate }),
          ...(endDate && { lte: endDate }),
        }
      }),
      ...((courseId || yearLevel || section || studySession) && {
        Student: {
          ...(courseId && { CourseId: courseId }),
          ...(yearLevel && { YearLevel: yearLevel }),
          ...(section && { Section: section }),
          ...(studySession && { StudySession: studySession }),
        }
      })
    };

    const [total, users, totalUserCount, roleCount, activeCount] = [
      await prisma.m_User.count({ where }),
      await prisma.m_User.findMany({
        where,
        skip,
        take: limit,
        orderBy: { CreatedAt: "desc" },
        select: {
          UserToken: true,
          Email: true,
          FirstName: true,
          LastName: true,
          MiddleName: true,
          IsActive: true,
          IsLocked: true,
          LastLoginAt: true,
          CreatedAt: true,
          Role: { select: { RoleId: true, RoleName: true } },
          Student: {
            select: {
              StudentId: true,
              StudentNumber: true,
              Course: {
                select: { CourseToken: true }
              },
              YearLevel: true,
              Section: true,
              StudySession: true,
            },
          },
          Instructor: {
            select: {
              InstructorId: true,
              EmployeeNumber: true,
              DepartmentId: true,
              Department: {
                select: {
                  DepartmentToken: true,
                  DepartmentCode: true,
                  DepartmentName: true,
                }
              }
            },
          },
        },
      }),
      await prisma.m_User.count({ where: { DeletedAt: null } }),
      await prisma.m_Role.count(),
      await prisma.m_User.count({ where: { DeletedAt: null, IsActive: true } }),
    ];

    return applySecurityHeaders(
      NextResponse.json({
        data: users,
        meta: { 
          total, 
          page, 
          limit, 
          totalPages: Math.ceil(total / limit),
          stats: {
            userCount: totalUserCount,
            roleCount,
            activeCount
          }
        },
      })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Users GET] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

// ─── POST /api/users — Create user (Admin only) ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "users", "CanCreate");
    const body = await req.json();

    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const data = parsed.data;

    // Validate manual password strength
    const { valid, errors } = validatePasswordStrength(data.Password);
    if (!valid) {
      return applySecurityHeaders(
        NextResponse.json({ error: "WEAK_PASSWORD", message: errors.join(", ") }, { status: 400 })
      );
    }

    const finalPassword = data.Password;
    const passwordHash = await hashPassword(finalPassword);

    // Verify role exists
    const role = await prisma.m_Role.findUnique({
      where: { RoleId: data.RoleId },
    });
    if (!role) {
      return applySecurityHeaders(
        NextResponse.json({ error: "ROLE_NOT_FOUND", message: "Invalid role" }, { status: 400 })
      );
    }

    // Check email uniqueness
    const existing = await prisma.m_User.findFirst({
      where: { Email: data.Email, DeletedAt: null },
    });
    if (existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "EMAIL_EXISTS", message: "Email already in use" }, { status: 409 })
      );
    }

    // Create user + profile in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.m_User.create({
        data: {
          Email: data.Email,
          PasswordHash: passwordHash,
          FirstName: data.FirstName,
          LastName: data.LastName,
          MiddleName: data.MiddleName,
          RoleId: data.RoleId,
          PasswordChangedAt: null, // Force password change on first login
        },
        include: { Role: true },
      });

      // Create role-specific profile
      if (role.RoleName === ROLES.STUDENT && data.StudentNumber) {
        let internalCourseId: number | null = null;
        if (data.CourseToken) {
          const course = await tx.m_Course.findUnique({
            where: { CourseToken: data.CourseToken }
          });
          if (course) {
            internalCourseId = course.CourseId;
          }
        }

        await tx.m_Student.create({
          data: {
            UserId: created.UserId,
            StudentNumber: data.StudentNumber,
            CourseId: internalCourseId,
            YearLevel: data.YearLevel ?? null,
            Section: data.Section ?? null,
            StudySession: data.StudySession ?? null,
          },
        });
      } else if (role.RoleName === ROLES.INSTRUCTOR && data.EmployeeNumber) {
        let internalDeptId: number | null = null;
        if (data.DepartmentToken) {
          const dept = await tx.m_Department.findUnique({
            where: { DepartmentToken: data.DepartmentToken }
          });
          if (dept) {
            internalDeptId = dept.DepartmentId;
          }
        }
        await tx.m_Instructor.create({
          data: {
            UserId: created.UserId,
            EmployeeNumber: data.EmployeeNumber,
            DepartmentId: internalDeptId,
          },
        });
      }

      return created;
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail({
      to: newUser.Email,
      firstName: newUser.FirstName,
      tempPassword: finalPassword,
      role: role.RoleName,
    }).catch((e) => console.error("[Email] Welcome email failed:", e));

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "USER_CREATED",
      entityType: "M_User",
      entityId: newUser.UserId,
      newValues: sanitizeForAudit({
        Email: newUser.Email,
        FirstName: newUser.FirstName,
        LastName: newUser.LastName,
        RoleId: newUser.RoleId,
      }),
      ipAddress: ip,
    });

    return applySecurityHeaders(
      NextResponse.json(
        {
          success: true,
          data: {
            UserToken: newUser.UserToken,
            Email: newUser.Email,
            FirstName: newUser.FirstName,
            LastName: newUser.LastName,
            Role: newUser.Role.RoleName,
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
    console.error("[Users POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
