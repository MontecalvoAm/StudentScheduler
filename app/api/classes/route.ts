import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError , requirePermission } from "@/lib/auth/rbac";
import { CreateClassSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    await await requirePermission(req, "classes", "CanRead");
    const classes = await prisma.mT_Class.findMany({
      where: { DeletedAt: null },
      include: {
        Subject: true,
        Semester: {
          include: { SchoolYear: true },
        },
        Enrollments: { where: { Status: "ACTIVE" } },
        ClassAssignments: {
          where: { RemovedAt: null },
          include: {
            Instructor: {
              include: {
                User: {
                  select: { FirstName: true, LastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { CreatedAt: "desc" },
    });
    return applySecurityHeaders(NextResponse.json({ success: true, classes }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "classes", "CanCreate");
    const body = await req.json();

    const parsed = CreateClassSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 })
      );
    }

    const { SubjectId, SemesterId, SectionCode, MaxStudents, StudySession } = parsed.data;

    // Check duplicate
    const existing = await prisma.mT_Class.findFirst({
      where: {
        SubjectId,
        SemesterId,
        SectionCode,
        DeletedAt: null,
      },
    });

    if (existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "CLASS_EXISTS", message: "Class section already exists in this semester" }, { status: 409 })
      );
    }

    const newClass = await prisma.mT_Class.create({
      data: {
        SubjectId,
        SemesterId,
        SectionCode,
        MaxStudents,
        StudySession,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "CLASS_CREATED",
      entityType: "MT_Class",
      entityId: newClass.ClassId.toString(),
      newValues: { SubjectId, SemesterId, SectionCode, MaxStudents, StudySession },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, class: newClass }, { status: 201 }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Classes POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
