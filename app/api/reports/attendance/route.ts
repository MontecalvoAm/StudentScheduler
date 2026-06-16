import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.INSTRUCTOR);
    const { searchParams } = req.nextUrl;

    const classIdStr = searchParams.get("classId");
    if (!classIdStr) {
      return applySecurityHeaders(
        NextResponse.json({ error: "MISSING_CLASS_ID", message: "ClassId parameter is required" }, { status: 400 })
      );
    }

    const classId = parseInt(classIdStr, 10);
    if (isNaN(classId)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INVALID_CLASS_ID" }, { status: 400 })
      );
    }

    // Verify class belongs to instructor or user is admin
    const isAssigned = await prisma.sched_ClassAssignments.findFirst({
      where: {
        ClassId: classId,
        ...(user.role === ROLES.INSTRUCTOR && {
          Instructor: { UserId: user.userId },
        }),
      },
    });

    if (!isAssigned && user.role !== ROLES.SUPER_ADMIN) {
      return applySecurityHeaders(
        NextResponse.json({ error: "FORBIDDEN", message: "You are not assigned to this class" }, { status: 403 })
      );
    }

    // Get class details
    const targetClass = await prisma.sched_Classes.findUnique({
      where: { ClassId: classId },
      include: {
        Subject: true,
        Semester: { include: { SchoolYear: true } },
      },
    });

    if (!targetClass) {
      return applySecurityHeaders(
        NextResponse.json({ error: "CLASS_NOT_FOUND" }, { status: 404 })
      );
    }

    // Get enrolled students
    const enrollments = await prisma.sched_Enrollments.findMany({
      where: { ClassId: classId, Status: "ACTIVE" },
      include: {
        Student: {
          include: {
            User: { select: { FirstName: true, LastName: true, Email: true } },
          },
        },
      },
    });

    // Get all completed sessions for this class schedules
    const schedules = await prisma.sched_Schedules.findMany({
      where: { ClassId: classId, IsActive: true },
      select: { ScheduleId: true },
    });

    const scheduleIds = schedules.map((s) => s.ScheduleId);

    const sessions = await prisma.sched_AttendanceSessions.findMany({
      where: {
        ScheduleId: { in: scheduleIds },
        Status: "CLOSED",
      },
      select: { SessionId: true },
    });

    const sessionIds = sessions.map((s) => s.SessionId);

    // Get attendance records for these sessions
    const records = await prisma.sched_AttendanceRecords.findMany({
      where: { SessionId: { in: sessionIds } },
      select: { StudentId: true, Status: true },
    });

    // Process roster data
    const roster = enrollments.map((enr) => {
      const studentId = enr.StudentId;
      const studentRecords = records.filter((r) => r.StudentId === studentId);

      const present = studentRecords.filter((r) => r.Status === "PRESENT").length;
      const late = studentRecords.filter((r) => r.Status === "LATE").length;
      const absent = studentRecords.filter((r) => r.Status === "ABSENT").length;
      const excused = studentRecords.filter((r) => r.Status === "EXCUSED").length;
      const totalRecords = studentRecords.length;

      // Present + Late counts towards attendance rate
      const rate = totalRecords > 0 ? ((present + late) / totalRecords) * 100 : 100;

      return {
        StudentId: studentId,
        StudentNumber: enr.Student.StudentNumber,
        FirstName: enr.Student.User.FirstName,
        LastName: enr.Student.User.LastName,
        Email: enr.Student.User.Email,
        Present: present,
        Late: late,
        Absent: absent,
        Excused: excused,
        TotalSessions: totalRecords,
        AttendanceRate: rate,
      };
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          classDetails: {
            ClassId: targetClass.ClassId,
            SubjectCode: targetClass.Subject.SubjectCode,
            SubjectName: targetClass.Subject.SubjectName,
            SectionCode: targetClass.SectionCode,
            SemesterName: targetClass.Semester.SemesterName,
            SchoolYear: targetClass.Semester.SchoolYear.YearLabel,
          },
          totalClosedSessions: sessionIds.length,
          roster,
        },
      })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Report API] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
