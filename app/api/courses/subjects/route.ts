import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError , requirePermission } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";
import crypto from "crypto";

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

export async function GET(req: NextRequest) {
  try {
    await await requirePermission(req, "subjects", "CanRead");
    const { searchParams } = req.nextUrl;
    const courseToken = searchParams.get("courseToken");

    if (!courseToken) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "courseToken is required." }, { status: 400 }));
    }

    const course = await prisma.m_Course.findUnique({
      where: { CourseToken: courseToken, DeletedAt: null },
      select: { CourseId: true }
    });

    if (!course) {
      return applySecurityHeaders(NextResponse.json({ error: "NOT_FOUND", message: "Course not found." }, { status: 404 }));
    }

    // Get mapped subjects
    const mappings = await prisma.m_CourseSubject.findMany({
      where: { CourseId: course.CourseId, DeletedAt: null },
      include: {
        Subject: {
          select: {
            SubjectId: true,
            SubjectToken: true,
            SubjectCode: true,
            SubjectName: true,
            Units: true,
          }
        }
      },
      orderBy: [
        { YearLevel: "asc" },
        { Semester: "asc" }
      ]
    });

    // Get all active subjects in system to allow mapping them
    const allSubjects = await prisma.m_Subject.findMany({
      where: { IsActive: true, DeletedAt: null },
      select: {
        SubjectToken: true,
        SubjectCode: true,
        SubjectName: true,
        Units: true,
      }
    });

    return applySecurityHeaders(NextResponse.json({
      success: true,
      mappings: mappings.map(m => ({
        CourseSubjectToken: m.CourseSubjectToken,
        YearLevel: m.YearLevel,
        Semester: m.Semester,
        Subject: m.Subject
      })),
      allSubjects
    }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "subjects", "CanCreate");
    const body = await req.json();
    const { CourseToken, SubjectToken, YearLevel, Semester } = body;

    if (!CourseToken || !SubjectToken || !YearLevel || !Semester) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "All fields are required." }, { status: 400 }));
    }

    const [course, subject] = await Promise.all([
      prisma.m_Course.findUnique({ where: { CourseToken, DeletedAt: null } }),
      prisma.m_Subject.findUnique({ where: { SubjectToken, DeletedAt: null } })
    ]);

    if (!course || !subject) {
      return applySecurityHeaders(NextResponse.json({ error: "NOT_FOUND", message: "Course or Subject not found." }, { status: 404 }));
    }

    const token = generateToken();

    const mapping = await prisma.m_CourseSubject.create({
      data: {
        CourseSubjectToken: token,
        CourseId: course.CourseId,
        SubjectId: subject.SubjectId,
        YearLevel: parseInt(YearLevel, 10),
        Semester: parseInt(Semester, 10),
        CreatedBy: user.userId,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, mapping }));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    if (error.code === "P2002") {
      return applySecurityHeaders(NextResponse.json({ error: "DUPLICATE_ERROR", message: "Subject is already mapped to this year and semester for this course." }, { status: 400 }));
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requirePermission(req, "subjects", "CanDelete");
    const { searchParams } = req.nextUrl;
    const courseSubjectToken = searchParams.get("courseSubjectToken");

    if (!courseSubjectToken) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "courseSubjectToken is required." }, { status: 400 }));
    }

    await prisma.m_CourseSubject.update({
      where: { CourseSubjectToken: courseSubjectToken },
      data: {
        DeletedAt: new Date(),
        DeletedBy: user.userId,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}
