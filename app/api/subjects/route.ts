import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { CreateSubjectSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ROLES.SUPER_ADMIN);
    const [subjects, totalSubjects, activeSubjects, unitsAgg] = [
      await prisma.m_Subject.findMany({
        orderBy: { SubjectCode: "asc" },
      }),
      await prisma.m_Subject.count(),
      await prisma.m_Subject.count({ where: { IsActive: true } }),
      await prisma.m_Subject.aggregate({
        _sum: { Units: true }
      })
    ];
    return applySecurityHeaders(NextResponse.json({ 
      success: true, 
      subjects,
      stats: {
        totalSubjects,
        activeSubjects,
        totalUnits: unitsAgg._sum.Units ?? 0
      }
    }));
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
    const user = await requireRole(req, ROLES.SUPER_ADMIN);
    const body = await req.json();

    const parsed = CreateSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 })
      );
    }

    const { SubjectCode, SubjectName, Units, Description, CourseId } = parsed.data;

    const existing = await prisma.m_Subject.findUnique({
      where: { SubjectCode },
    });

    if (existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "SUBJECT_EXISTS", message: "Subject code already registered" }, { status: 409 })
      );
    }

    const subject = await prisma.m_Subject.create({
      data: {
        SubjectCode,
        SubjectName,
        Units,
        Description,
        CourseId,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "SUBJECT_CREATED",
      entityType: "M_Subject",
      entityId: subject.SubjectId.toString(),
      newValues: { SubjectCode, SubjectName, Units },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, subject }, { status: 201 }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Subjects POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
