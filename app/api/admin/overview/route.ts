import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ROLES.SUPER_ADMIN);

    // Get count summaries
    const [
      studentCount,
      instructorCount,
      adminCount,
      classCount,
      roomCount,
      subjectCount,
      todaySchedules,
      recentRegistrations,
    ] = [
      await prisma.sched_Students.count({ where: { DeletedAt: null } }),
      await prisma.sched_Instructors.count({ where: { DeletedAt: null } }),
      await prisma.sched_Users.count({
        where: { Role: { RoleName: "SUPER_ADMIN" }, DeletedAt: null },
      }),
      await prisma.sched_Classes.count({ where: { DeletedAt: null } }),
      await prisma.sched_Rooms.count({ where: { IsActive: true } }),
      await prisma.sched_Subjects.count({ where: { IsActive: true } }),
      // Today's Schedules (matching current DayOfWeek)
      await prisma.sched_Schedules.findMany({
        where: { 
          DayOfWeek: new Date().getDay(),
          IsActive: true
        },
        take: 5,
        include: {
          Class: {
            include: {
              Subject: { select: { SubjectName: true, SubjectCode: true } }
            }
          },
          Room: { select: { RoomCode: true } }
        },
        orderBy: { StartTime: "asc" }
      }),
      // Recent Registrations
      await prisma.sched_Users.findMany({
        where: { DeletedAt: null },
        take: 5,
        orderBy: { CreatedAt: "desc" },
        select: {
          UserId: true,
          FirstName: true,
          LastName: true,
          Email: true,
          CreatedAt: true,
          Role: { select: { RoleName: true } }
        }
      })
    ];

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          metrics: {
            students: studentCount,
            instructors: instructorCount,
            admins: adminCount,
            classes: classCount,
            rooms: roomCount,
            subjects: subjectCount,
          },
          todaySchedules,
          recentRegistrations,
        },
      })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Admin Overview API] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
