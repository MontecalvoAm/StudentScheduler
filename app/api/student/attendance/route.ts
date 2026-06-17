import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.STUDENT);

    const student = await prisma.m_Student.findUnique({
      where: { UserId: user.userId },
    });

    if (!student) {
      return applySecurityHeaders(
        NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 })
      );
    }

    const records = await prisma.t_AttendanceRecord.findMany({
      where: { StudentId: student.StudentId },
      include: {
        Session: {
          include: {
            Schedule: {
              include: {
                Class: {
                  include: {
                    Subject: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { MarkedAt: "desc" },
    });

    return applySecurityHeaders(
      NextResponse.json({ success: true, records })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Student Attendance API] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
