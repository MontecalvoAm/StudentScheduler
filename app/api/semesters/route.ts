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
