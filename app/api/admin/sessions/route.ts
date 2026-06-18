import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError, requirePermission } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "schedules", "CanRead");

    const sessionGroups = await prisma.m_Student.groupBy({
      by: ["StudySession"],
      _count: {
        StudentId: true,
      },
      where: {
        DeletedAt: null,
      },
    });

    const sessions = sessionGroups.map((group) => ({
      name: group.StudySession || "UNASSIGNED",
      studentCount: group._count.StudentId,
    }));

    return applySecurityHeaders(NextResponse.json({ success: true, sessions }));
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
