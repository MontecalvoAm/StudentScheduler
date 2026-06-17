import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.STUDENT);

    // Get student record
    const student = await prisma.m_Student.findUnique({
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

    // 1. Get Today's Schedules
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday...6=Saturday

    const schedules = await prisma.mT_Schedule.findMany({
      where: {
        ClassId: { in: classIds },
        DayOfWeek: dayOfWeek,
        IsActive: true,
      },
      include: {
        Class: {
          include: {
            Subject: { select: { SubjectCode: true, SubjectName: true } },
          },
        },
        Room: { select: { RoomCode: true, RoomName: true } },
      },
      orderBy: { StartTime: "asc" },
    });

    // 2. Get active attendance sessions for today
    const activeSessions = await prisma.t_AttendanceSession.findMany({
      where: {
        Schedule: { ClassId: { in: classIds } },
        Status: "OPEN",
        SessionDate: { equals: today },
      },
      include: {
        Schedule: {
          include: {
            Class: {
              include: {
                Subject: { select: { SubjectCode: true, SubjectName: true } },
              },
            },
            Room: { select: { RoomCode: true } },
          },
        },
        // Include their marked attendance record for this session if it exists
        AttendanceRecords: {
          where: { StudentId: student.StudentId },
        },
      },
    });

    // 3. Get overall attendance stats
    const records = await prisma.t_AttendanceRecord.findMany({
      where: { StudentId: student.StudentId },
      select: { Status: true },
    });

    const stats = {
      present: records.filter((r) => r.Status === "PRESENT").length,
      late: records.filter((r) => r.Status === "LATE").length,
      absent: records.filter((r) => r.Status === "ABSENT").length,
      excused: records.filter((r) => r.Status === "EXCUSED").length,
      total: records.length,
      percentage: 0,
    };

    if (stats.total > 0) {
      // Present and Late are considered present for percentage (or late weighted as 0.7-1.0; here let's count present + late as present)
      stats.percentage = ((stats.present + stats.late) / stats.total) * 100;
    } else {
      stats.percentage = 100; // default 100% if no sessions yet
    }

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          schedules,
          activeSessions: activeSessions.map((session) => ({
            SessionId: session.SessionId,
            SubjectName: session.Schedule.Class.Subject.SubjectName,
            SubjectCode: session.Schedule.Class.Subject.SubjectCode,
            RoomCode: session.Schedule.Room.RoomCode,
            StartTime: session.Schedule.StartTime,
            EndTime: session.Schedule.EndTime,
            Method: session.Method,
            AlreadyMarked: session.AttendanceRecords.length > 0,
            MarkedStatus: session.AttendanceRecords[0]?.Status ?? null,
            MarkedAt: session.AttendanceRecords[0]?.MarkedAt ?? null,
          })),
          stats,
        },
      })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Student Dashboard API] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
