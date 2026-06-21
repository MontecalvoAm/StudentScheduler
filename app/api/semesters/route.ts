import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError, requirePermission } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "calendar", "CanRead");

    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    if (all) {
      const semesters = await prisma.m_Semester.findMany({
        include: { SchoolYear: true },
        orderBy: [
          { SchoolYear: { YearLabel: "desc" } },
          { SemesterName: "asc" }
        ],
      });

      const schoolYears = await prisma.m_SchoolYear.findMany({
        orderBy: { YearLabel: "desc" },
      });

      return applySecurityHeaders(NextResponse.json({ success: true, semesters, schoolYears }));
    }

    const semesters = await prisma.m_Semester.findMany({
      where: { IsActive: true },
      include: { SchoolYear: true },
      orderBy: { SemesterName: "asc" },
    });

    return applySecurityHeaders(NextResponse.json({ success: true, semesters }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "calendar", "CanCreate");
    const body = await req.json();
    const { type } = body;

    if (!type) {
      return applySecurityHeaders(
        NextResponse.json({ error: "BAD_REQUEST", message: "Missing type" }, { status: 400 })
      );
    }

    if (type === "schoolYear") {
      const { yearLabel, startDate, endDate } = body;
      if (!yearLabel || !startDate || !endDate) {
        return applySecurityHeaders(
          NextResponse.json({ error: "BAD_REQUEST", message: "Missing yearLabel, startDate, or endDate" }, { status: 400 })
        );
      }

      const existing = await prisma.m_SchoolYear.findUnique({ where: { YearLabel: yearLabel } });
      if (existing) {
        return applySecurityHeaders(
          NextResponse.json({ error: "CONFLICT", message: "School Year already exists" }, { status: 409 })
        );
      }

      const schoolYear = await prisma.m_SchoolYear.create({
        data: {
          YearLabel: yearLabel,
          StartDate: new Date(startDate),
          EndDate: new Date(endDate),
          IsActive: false,
          CreatedBy: user.userId
        }
      });
      return applySecurityHeaders(NextResponse.json({ success: true, schoolYear }, { status: 201 }));

    } else if (type === "semester") {
      const { schoolYearId, semesterName, startDate, endDate } = body;
      if (!schoolYearId || !semesterName || !startDate || !endDate) {
        return applySecurityHeaders(
          NextResponse.json({ error: "BAD_REQUEST", message: "Missing schoolYearId, semesterName, startDate, or endDate" }, { status: 400 })
        );
      }

      const existing = await prisma.m_Semester.findFirst({
        where: { SchoolYearId: parseInt(schoolYearId), SemesterName: semesterName }
      });
      if (existing) {
        return applySecurityHeaders(
          NextResponse.json({ error: "CONFLICT", message: "Semester already exists for this school year" }, { status: 409 })
        );
      }

      const semester = await prisma.m_Semester.create({
        data: {
          SchoolYearId: parseInt(schoolYearId),
          SemesterName: semesterName,
          StartDate: new Date(startDate),
          EndDate: new Date(endDate),
          IsActive: false,
          CreatedBy: user.userId
        }
      });
      return applySecurityHeaders(NextResponse.json({ success: true, semester }, { status: 201 }));
    }

    return applySecurityHeaders(
      NextResponse.json({ error: "BAD_REQUEST", message: "Invalid type" }, { status: 400 })
    );

  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requirePermission(req, "calendar", "CanUpdate");
    const body = await req.json();
    const { type, id, isActive } = body;

    if (!type || !id || typeof isActive !== "boolean") {
      return applySecurityHeaders(
        NextResponse.json({ error: "BAD_REQUEST", message: "Missing type, id, or isActive status" }, { status: 400 })
      );
    }

    if (type === "semester") {
      if (isActive) {
        // Set all other semesters to inactive
        await prisma.m_Semester.updateMany({
          where: { SemesterId: { not: id } },
          data: { IsActive: false }
        });
      }
      
      const updated = await prisma.m_Semester.update({
        where: { SemesterId: id },
        data: { IsActive: isActive },
      });
      return applySecurityHeaders(NextResponse.json({ success: true, semester: updated }));
    } else if (type === "schoolYear") {
      if (isActive) {
        // Set all other school years to inactive
        await prisma.m_SchoolYear.updateMany({
          where: { SchoolYearId: { not: id } },
          data: { IsActive: false }
        });
      }

      const updated = await prisma.m_SchoolYear.update({
        where: { SchoolYearId: id },
        data: { IsActive: isActive },
      });
      return applySecurityHeaders(NextResponse.json({ success: true, schoolYear: updated }));
    }

    return applySecurityHeaders(
      NextResponse.json({ error: "BAD_REQUEST", message: "Invalid type" }, { status: 400 })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission(req, "calendar", "CanUpdate");
    const body = await req.json();
    const { type, id } = body;

    if (!type || !id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "BAD_REQUEST", message: "Missing type or id" }, { status: 400 })
      );
    }

    if (type === "schoolYear") {
      const { yearLabel, startDate, endDate } = body;
      if (!yearLabel || !startDate || !endDate) {
        return applySecurityHeaders(
          NextResponse.json({ error: "BAD_REQUEST", message: "Missing required fields" }, { status: 400 })
        );
      }
      
      const existing = await prisma.m_SchoolYear.findFirst({
        where: { YearLabel: yearLabel, SchoolYearId: { not: id } }
      });
      if (existing) {
        return applySecurityHeaders(
          NextResponse.json({ error: "CONFLICT", message: "School Year label already exists" }, { status: 409 })
        );
      }

      const updated = await prisma.m_SchoolYear.update({
        where: { SchoolYearId: id },
        data: {
          YearLabel: yearLabel,
          StartDate: new Date(startDate),
          EndDate: new Date(endDate)
        }
      });
      return applySecurityHeaders(NextResponse.json({ success: true, schoolYear: updated }));
    } else if (type === "semester") {
      const { schoolYearId, semesterName, startDate, endDate } = body;
      if (!schoolYearId || !semesterName || !startDate || !endDate) {
        return applySecurityHeaders(
          NextResponse.json({ error: "BAD_REQUEST", message: "Missing required fields" }, { status: 400 })
        );
      }

      const existing = await prisma.m_Semester.findFirst({
        where: { 
          SchoolYearId: parseInt(schoolYearId), 
          SemesterName: semesterName,
          SemesterId: { not: id }
        }
      });
      if (existing) {
        return applySecurityHeaders(
          NextResponse.json({ error: "CONFLICT", message: "Semester name already exists for this year" }, { status: 409 })
        );
      }

      const updated = await prisma.m_Semester.update({
        where: { SemesterId: id },
        data: {
          SchoolYearId: parseInt(schoolYearId),
          SemesterName: semesterName,
          StartDate: new Date(startDate),
          EndDate: new Date(endDate)
        }
      });
      return applySecurityHeaders(NextResponse.json({ success: true, semester: updated }));
    }

    return applySecurityHeaders(
      NextResponse.json({ error: "BAD_REQUEST", message: "Invalid type" }, { status: 400 })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requirePermission(req, "calendar", "CanDelete");
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = parseInt(searchParams.get("id") || "0");

    if (!type || !id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "BAD_REQUEST", message: "Missing type or id" }, { status: 400 })
      );
    }

    if (type === "schoolYear") {
      const semestersCount = await prisma.m_Semester.count({
        where: { SchoolYearId: id }
      });
      
      if (semestersCount > 0) {
        return applySecurityHeaders(
          NextResponse.json({ error: "BAD_REQUEST", message: "Cannot delete School Year because it contains existing Semesters. Delete the Semesters first." }, { status: 400 })
        );
      }

      await prisma.m_SchoolYear.delete({
        where: { SchoolYearId: id }
      });
      return applySecurityHeaders(NextResponse.json({ success: true }));
      
    } else if (type === "semester") {
      const classesCount = await prisma.mT_Class.count({
        where: { SemesterId: id }
      });

      if (classesCount > 0) {
        return applySecurityHeaders(
          NextResponse.json({ error: "BAD_REQUEST", message: "Cannot delete Semester because there are existing Classes tied to it." }, { status: 400 })
        );
      }

      await prisma.m_Semester.delete({
        where: { SemesterId: id }
      });
      return applySecurityHeaders(NextResponse.json({ success: true }));
    }

    return applySecurityHeaders(
      NextResponse.json({ error: "BAD_REQUEST", message: "Invalid type" }, { status: 400 })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
