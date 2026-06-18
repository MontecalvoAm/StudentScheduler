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
    const user = await requirePermission(req, "courses", "CanRead");
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || "";

    const courses = await prisma.m_Course.findMany({
      where: {
        DeletedAt: null,
        OR: [
          { CourseCode: { contains: search } },
          { CourseName: { contains: search } },
        ]
      },
      select: {
        CourseToken: true,
        CourseCode: true,
        CourseName: true,
        Description: true,
        YearsDuration: true,
        RequiredUnits: true,
        IsActive: true,
        DepartmentId: true,
        Department: {
          select: {
            DepartmentToken: true,
            DepartmentCode: true,
            DepartmentName: true,
          }
        },
        _count: {
          select: { CourseSubjects: { where: { DeletedAt: null } } }
        }
      },
      orderBy: { CreatedAt: "desc" }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, courses }));
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
    const user = await requirePermission(req, "courses", "CanCreate");
    const body = await req.json();
    const { CourseCode, CourseName, Description, YearsDuration, RequiredUnits, DepartmentToken } = body;

    if (!CourseCode || !CourseName) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "CourseCode and CourseName are required." }, { status: 400 }));
    }

    const token = generateToken();

    let departmentId: number | null = null;
    if (DepartmentToken) {
      const dept = await prisma.m_Department.findUnique({
        where: { DepartmentToken }
      });
      if (dept) {
        departmentId = dept.DepartmentId;
      }
    }

    const newCourse = await prisma.m_Course.create({
      data: {
        CourseToken: token,
        CourseCode: CourseCode.toUpperCase(),
        CourseName,
        Description,
        YearsDuration: parseInt(YearsDuration, 10) || 4,
        RequiredUnits: parseInt(RequiredUnits, 10) || 120,
        CreatedBy: user.userId,
        DepartmentId: departmentId,
      },
      select: {
        CourseToken: true,
        CourseCode: true,
        CourseName: true,
        YearsDuration: true,
        RequiredUnits: true,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, course: newCourse }));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    if (error.code === "P2002") {
      return applySecurityHeaders(NextResponse.json({ error: "DUPLICATE_ERROR", message: "Course code already exists." }, { status: 400 }));
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission(req, "courses", "CanUpdate");
    const body = await req.json();
    const { CourseToken, CourseCode, CourseName, Description, YearsDuration, RequiredUnits, IsActive, DepartmentToken } = body;

    if (!CourseToken) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "CourseToken is required." }, { status: 400 }));
    }

    let departmentId: number | null | undefined = undefined;
    if (DepartmentToken !== undefined) {
      if (DepartmentToken === null) {
        departmentId = null;
      } else {
        const dept = await prisma.m_Department.findUnique({
          where: { DepartmentToken }
        });
        if (dept) {
          departmentId = dept.DepartmentId;
        }
      }
    }

    const updatedCourse = await prisma.m_Course.update({
      where: { CourseToken },
      data: {
        CourseCode: CourseCode?.toUpperCase(),
        CourseName,
        Description,
        YearsDuration: YearsDuration !== undefined ? parseInt(YearsDuration, 10) : undefined,
        RequiredUnits: RequiredUnits !== undefined ? parseInt(RequiredUnits, 10) : undefined,
        IsActive: IsActive,
        UpdatedBy: user.userId,
        DepartmentId: departmentId,
      },
      select: {
        CourseToken: true,
        CourseCode: true,
        CourseName: true,
        YearsDuration: true,
        RequiredUnits: true,
        IsActive: true,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, course: updatedCourse }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requirePermission(req, "courses", "CanDelete");
    const { searchParams } = req.nextUrl;
    const courseToken = searchParams.get("courseToken");

    if (!courseToken) {
      return applySecurityHeaders(NextResponse.json({ error: "VALIDATION_ERROR", message: "courseToken query param is required." }, { status: 400 }));
    }

    await prisma.m_Course.update({
      where: { CourseToken: courseToken },
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
