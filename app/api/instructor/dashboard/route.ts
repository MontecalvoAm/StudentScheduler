import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.INSTRUCTOR);

    const instructor = await prisma.sched_Instructors.findUnique({
      where: { UserId: user.userId },
    });

    if (!instructor) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INSTRUCTOR_NOT_FOUND" }, { status: 404 })
      );
    }

    const today = new Date();
    const dayOfWeek = today.getDay();

    // 1. Get Today's Schedules for the Instructor
    const schedules = await prisma.sched_Schedules.findMany({
      where: {
        Class: {
          DeletedAt: null,
          ClassAssignments: {
            some: {
              InstructorId: instructor.InstructorId,
              RemovedAt: null,
            },
          },
        },
        DayOfWeek: dayOfWeek,
        IsActive: true,
      },
      include: {
        Class: {
          include: {
            Subject: true,
            Enrollments: { where: { Status: "ACTIVE" } },
          },
        },
        Room: true,
      },
      orderBy: { StartTime: "asc" },
    });

    // 2. Get active (OPEN) attendance sessions
    const activeSessions = await prisma.sched_AttendanceSessions.findMany({
      where: {
        Schedule: {
          Class: {
            ClassAssignments: {
              some: {
                InstructorId: instructor.InstructorId,
                RemovedAt: null,
              },
            },
          },
        },
        Status: "OPEN",
      },
      include: {
        Schedule: {
          include: {
            Class: {
              include: {
                Subject: true,
                Enrollments: { where: { Status: "ACTIVE" } },
              },
            },
          },
        },
        AttendanceRecords: true,
      },
    });

    // 3. Get all classes assigned to this instructor
    const classes = await prisma.sched_Classes.findMany({
      where: {
        DeletedAt: null,
        ClassAssignments: {
          some: {
            InstructorId: instructor.InstructorId,
            RemovedAt: null,
          },
        },
      },
      include: {
        Subject: true,
        Semester: {
          include: { SchoolYear: true },
        },
        Enrollments: { where: { Status: "ACTIVE" } },
      },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          schedules,
          activeSessions: activeSessions.map((s) => ({
            SessionId: s.SessionId,
            SubjectCode: s.Schedule.Class.Subject.SubjectCode,
            SubjectName: s.Schedule.Class.Subject.SubjectName,
            SectionCode: s.Schedule.Class.SectionCode,
            Method: s.Method,
            OpenedAt: s.OpenedAt,
            AutoCloseAt: s.AutoCloseAt,
            EnrolledCount: s.Schedule.Class.Enrollments.length,
            MarkedCount: s.AttendanceRecords.length,
            QrCodeToken: s.QrCodeToken,
          })),
          classes,
        },
      })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Instructor Dashboard API] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
