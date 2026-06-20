import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function POST(req: NextRequest) {
  try {
    // Assuming "schedules" or a specific module for sessions. Using schedules as in GET.
    const user = await requirePermission(req, "schedules", "CanCreate");

    const body = await req.json();
    const { sessionType, startTime, endTime } = body;

    if (!sessionType || !startTime || !endTime) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Missing required fields." }, { status: 400 })
      );
    }

    const newSession = await prisma.m_StudySession.create({
      data: {
        SessionLabel: sessionType,
        StartTime: startTime,
        EndTime: endTime,
        IsActive: true,
        CreatedBy: user.UserId,
      },
    });

    return applySecurityHeaders(
      NextResponse.json({ success: true, session: newSession }, { status: 201 })
    );
  } catch (error: any) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    
    // Handle Prisma unique constraint violation
    if (error.code === 'P2002') {
      return applySecurityHeaders(
        NextResponse.json({ error: "DUPLICATE", message: "A session with this label already exists." }, { status: 409 })
      );
    }

    console.error("Failed to create session:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
