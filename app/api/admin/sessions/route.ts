import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "schedules", "CanRead");

    // Fetch the new sessions from the database
    const studySessions = await prisma.m_StudySession.findMany({
      where: { DeletedAt: null },
    });

    // We still need to count students who are assigned this session string
    // as we haven't migrated the M_Student schema yet.
    const sessionGroups = await prisma.m_Student.groupBy({
      by: ["StudySession"],
      _count: {
        StudentId: true,
      },
      where: {
        DeletedAt: null,
      },
    });

    const sessions = studySessions.map((session) => {
      // Find the count from the groups based on SessionLabel
      const group = sessionGroups.find(g => g.StudySession === session.SessionLabel);
      return {
        name: session.SessionLabel,
        studentCount: group ? group._count.StudentId : 0,
        startTime: session.StartTime,
        endTime: session.EndTime,
        isActive: session.IsActive,
      };
    });

    // Also include any sessions that exist in the students table but not in M_StudySession (legacy)
    sessionGroups.forEach(group => {
      if (group.StudySession && !sessions.find(s => s.name === group.StudySession)) {
        sessions.push({
          name: group.StudySession,
          studentCount: group._count.StudentId,
          startTime: "00:00",
          endTime: "00:00",
          isActive: false,
        });
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, sessions }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("Error in GET /api/admin/sessions:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
