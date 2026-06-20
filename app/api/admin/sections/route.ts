import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "classes", "CanRead");

    // Fetch the new sections from the database
    const studySections = await prisma.m_Section.findMany({
      where: { DeletedAt: null },
      include: { Course: true },
    });

    // We still need to count students who are assigned this section string
    // as we haven't migrated the M_Student schema yet.
    const sectionGroups = await prisma.m_Student.groupBy({
      by: ["Section"],
      _count: {
        StudentId: true,
      },
      where: {
        DeletedAt: null,
      },
    });

    const sections = studySections.map((section) => {
      // Find the count from the groups based on SectionName
      const group = sectionGroups.find(g => g.Section === section.SectionName);
      return {
        name: section.SectionName,
        courseCode: section.Course?.CourseCode || "N/A",
        studentCount: group ? group._count.StudentId : 0,
        isActive: section.IsActive,
      };
    });

    // Also include any sections that exist in the students table but not in M_Section (legacy)
    sectionGroups.forEach(group => {
      if (group.Section && !sections.find(s => s.name === group.Section)) {
        sections.push({
          name: group.Section,
          courseCode: "LEGACY",
          studentCount: group._count.StudentId,
          isActive: false,
        });
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, sections }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("Error in GET /api/admin/sections:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
