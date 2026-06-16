import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthUser(req);
    if (!session) {
      return applySecurityHeaders(
        NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
      );
    }

    const user = await prisma.sched_Users.findUnique({
      where: { UserId: session.userId },
      include: {
        Role: true,
        Student: { select: { StudentId: true, StudentNumber: true, Section: true, StudySession: true } },
        Instructor: { select: { InstructorId: true, EmployeeNumber: true } },
      },
    });

    if (!user || !user.IsActive || user.DeletedAt) {
      return applySecurityHeaders(
        NextResponse.json({ error: "ACCOUNT_INACTIVE" }, { status: 403 })
      );
    }

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        user: {
          UserId: user.UserId,
          Email: user.Email,
          FirstName: user.FirstName,
          LastName: user.LastName,
          Role: user.Role.RoleName,
          StudentId: user.Student?.StudentId ?? null,
          InstructorId: user.Instructor?.InstructorId ?? null,
          Section: user.Student?.Section ?? null,
          StudySession: user.Student?.StudySession ?? null,
        },
      })
    );
  } catch (error) {
    console.error("[Me GET] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
