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
    const user = await requirePermission(req, "departments", "CanRead");
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") || "";

    const departments = await prisma.m_Department.findMany({
      where: {
        DeletedAt: null,
        OR: [
          { DepartmentCode: { contains: search } },
          { DepartmentName: { contains: search } },
        ]
      },
      select: {
        DepartmentId: true,
        DepartmentToken: true,
        DepartmentCode: true,
        DepartmentName: true,
        Description: true,
        IsActive: true,
        _count: {
          select: { Courses: { where: { DeletedAt: null } } }
        }
      },
      orderBy: { CreatedAt: "desc" }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, departments }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[GET /api/departments] Runtime error:", error);
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission(req, "departments", "CanCreate");
    const body = await req.json();
    const { DepartmentCode, DepartmentName, Description } = body;

    if (!DepartmentCode || !DepartmentName) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", message: "DepartmentCode and DepartmentName are required." }, { status: 400 })
      );
    }

    const token = generateToken();

    const newDepartment = await prisma.m_Department.create({
      data: {
        DepartmentToken: token,
        DepartmentCode: DepartmentCode.toUpperCase(),
        DepartmentName,
        Description,
        CreatedBy: user.userId,
      },
      select: {
        DepartmentToken: true,
        DepartmentCode: true,
        DepartmentName: true,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, department: newDepartment }));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    if (error.code === "P2002") {
      return applySecurityHeaders(
        NextResponse.json({ error: "DUPLICATE_ERROR", message: "Department code already exists." }, { status: 400 })
      );
    }
    console.error("[POST /api/departments] Runtime error:", error);
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission(req, "departments", "CanUpdate");
    const body = await req.json();
    const { DepartmentToken, DepartmentCode, DepartmentName, Description, IsActive } = body;

    if (!DepartmentToken) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", message: "DepartmentToken is required." }, { status: 400 })
      );
    }

    const updatedDepartment = await prisma.m_Department.update({
      where: { DepartmentToken },
      data: {
        DepartmentCode: DepartmentCode?.toUpperCase(),
        DepartmentName,
        Description,
        IsActive: IsActive,
        UpdatedBy: user.userId,
      },
      select: {
        DepartmentToken: true,
        DepartmentCode: true,
        DepartmentName: true,
        IsActive: true,
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true, department: updatedDepartment }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[PUT /api/departments] Runtime error:", error);
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requirePermission(req, "departments", "CanDelete");
    const { searchParams } = req.nextUrl;
    const departmentToken = searchParams.get("departmentToken");

    if (!departmentToken) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", message: "departmentToken query param is required." }, { status: 400 })
      );
    }

    await prisma.m_Department.update({
      where: { DepartmentToken: departmentToken },
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
    console.error("[DELETE /api/departments] Runtime error:", error);
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}
