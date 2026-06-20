import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "classes", "CanCreate");

    const body = await req.json();
    const { CourseToken, SectionName } = body;

    if (!CourseToken || !SectionName) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Missing required fields." }, { status: 400 })
      );
    }

    // Resolve the CourseId from the CourseToken
    const course = await prisma.m_Course.findUnique({
      where: { CourseToken },
      select: { CourseId: true },
    });

    if (!course) {
      return applySecurityHeaders(
        NextResponse.json({ error: "NOT_FOUND", message: "Course not found." }, { status: 404 })
      );
    }

    const newSection = await prisma.m_Section.create({
      data: {
        CourseId: course.CourseId,
        SectionName: SectionName,
        IsActive: true,
        CreatedBy: user.UserId,
      },
    });

    return applySecurityHeaders(
      NextResponse.json({ success: true, section: newSection }, { status: 201 })
    );
  } catch (error: any) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    
    if (error.code === 'P2002') {
      return applySecurityHeaders(
        NextResponse.json({ error: "DUPLICATE", message: "This section already exists for the selected course." }, { status: 409 })
      );
    }

    console.error("Failed to create section:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
