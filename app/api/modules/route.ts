import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError, requirePermission } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(req, "roles", "CanRead");

    const modules = await prisma.m_Module.findMany({
      where:   { IsActive: true },
      orderBy: { SortOrder: "asc" },
      select:  { ModuleKey: true, ModuleLabel: true, SortOrder: true },
    });

    return applySecurityHeaders(NextResponse.json({ success: true, modules }));
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
