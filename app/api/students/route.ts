import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ROLES.SUPER_ADMIN);

    const students = await prisma.sched_Students.findMany({
      where: { DeletedAt: null },
      include: {
        User: {
          select: { FirstName: true, LastName: true, Email: true },
        },
      },
      orderBy: { User: { LastName: "asc" } },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        students: students.map((s) => ({
          StudentId: s.StudentId,
          StudentNumber: s.StudentNumber,
          FirstName: s.User.FirstName,
          LastName: s.User.LastName,
          Email: s.User.Email,
        })),
      })
    );
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
