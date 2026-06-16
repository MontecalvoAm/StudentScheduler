import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { EnrollStudentSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.SUPER_ADMIN);
    const body = await req.json();

    const parsed = EnrollStudentSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 })
      );
    }

    const { StudentId, ClassId } = parsed.data;

    // Verify student exists
    const student = await prisma.sched_Students.findUnique({
      where: { StudentId },
    });

    if (!student) {
      return applySecurityHeaders(
        NextResponse.json({ error: "STUDENT_NOT_FOUND", message: "Student record not found" }, { status: 404 })
      );
    }

    // Verify class exists and is active
    const targetClass = await prisma.sched_Classes.findUnique({
      where: { ClassId, DeletedAt: null },
      include: {
        Enrollments: { where: { Status: "ACTIVE" } },
      },
    });

    if (!targetClass) {
      return applySecurityHeaders(
        NextResponse.json({ error: "CLASS_NOT_FOUND", message: "Class not found or inactive" }, { status: 404 })
      );
    }

    // Check capacity
    if (targetClass.Enrollments.length >= targetClass.MaxStudents) {
      return applySecurityHeaders(
        NextResponse.json({ error: "CLASS_FULL", message: "Class has reached its maximum student capacity limit" }, { status: 400 })
      );
    }

    // Enroll student
    const enrollment = await prisma.sched_Enrollments.upsert({
      where: {
        StudentId_ClassId: { StudentId, ClassId },
      },
      update: {
        Status: "ACTIVE",
        DroppedAt: null,
      },
      create: {
        StudentId,
        ClassId,
        Status: "ACTIVE",
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "STUDENT_ENROLLED",
      entityType: "sched_Enrollments",
      entityId: enrollment.EnrollmentId.toString(),
      newValues: { StudentId, ClassId },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, enrollment }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Enrollment POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
