import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.STUDENT);

    const student = await prisma.sched_Students.findUnique({
      where: { UserId: user.userId },
      include: {
        Enrollments: {
          where: { Status: "ACTIVE" },
          select: { ClassId: true },
        },
      },
    });

    if (!student) {
      return applySecurityHeaders(
        NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 })
      );
    }

    const classIds = student.Enrollments.map((e) => e.ClassId);

    const schedules = await prisma.sched_Schedules.findMany({
      where: {
        ClassId: { in: classIds },
        IsActive: true,
      },
      include: {
        Class: {
          include: {
            Subject: true,
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
        },
        Room: true,
      },
      orderBy: [
        { DayOfWeek: "asc" },
        { StartTime: "asc" },
      ],
    });

    return applySecurityHeaders(
      NextResponse.json({ success: true, schedules })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Student Schedule API] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
