import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError , requirePermission } from "@/lib/auth/rbac";
import { AssignInstructorSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "classes", "CanCreate");
    const body = await req.json();

    const parsed = AssignInstructorSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 })
      );
    }

    const { InstructorId, ClassId, IsPrimary } = parsed.data;

    // Verify instructor exists
    const instructor = await prisma.m_Instructor.findUnique({
      where: { InstructorId },
    });

    if (!instructor) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INSTRUCTOR_NOT_FOUND", message: "Instructor record not found" }, { status: 404 })
      );
    }

    // Verify class exists and is active
    const targetClass = await prisma.mT_Class.findUnique({
      where: { ClassId, DeletedAt: null },
    });

    if (!targetClass) {
      return applySecurityHeaders(
        NextResponse.json({ error: "CLASS_NOT_FOUND", message: "Class not found or inactive" }, { status: 404 })
      );
    }

    // Assign instructor
    const assignment = await prisma.mT_ClassAssignment.upsert({
      where: {
        InstructorId_ClassId: { InstructorId, ClassId },
      },
      update: {
        RemovedAt: null,
        IsPrimary,
      },
      create: {
        InstructorId,
        ClassId,
        IsPrimary,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "INSTRUCTOR_ASSIGNED",
      entityType: "MT_ClassAssignment",
      entityId: assignment.AssignmentId.toString(),
      newValues: { InstructorId, ClassId, IsPrimary },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, assignment }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Assignment POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
