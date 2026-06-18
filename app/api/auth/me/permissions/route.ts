import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

/**
 * GET /api/auth/me/permissions
 * Returns the full permission map for the authenticated user keyed by ModuleKey.
 * SUPER_ADMIN receives full access on all modules without a DB query.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      throw new AuthError("UNAUTHORIZED", "Authentication required", 401);
    }

    // Fetch all active modules
    const modules = await prisma.m_Module.findMany({
      where:   { IsActive: true },
      orderBy: { SortOrder: "asc" },
      select:  { ModuleKey: true, ModuleLabel: true },
    });

    // SUPER_ADMIN gets universal access — no DB lookup needed
    if (user.role === ROLES.SUPER_ADMIN) {
      const permissions: Record<string, { CanCreate: boolean; CanRead: boolean; CanUpdate: boolean; CanDelete: boolean }> = {};
      for (const mod of modules) {
        permissions[mod.ModuleKey] = {
          CanCreate: true,
          CanRead:   true,
          CanUpdate: true,
          CanDelete: true,
        };
      }
      return applySecurityHeaders(NextResponse.json({ success: true, permissions }));
    }

    // For other roles, look up from M_RolePermission
    const roleRow = await prisma.m_Role.findFirst({
      where:  { RoleName: user.role, DeletedAt: null },
      select: { RoleId: true },
    });

    if (!roleRow) {
      throw new AuthError("FORBIDDEN", "Role not found", 403);
    }

    const dbPerms = await prisma.m_RolePermission.findMany({
      where:   { RoleId: roleRow.RoleId, DeletedAt: null },
      include: { Module: { select: { ModuleKey: true } } },
    });

    // Build the permissions map; default to all-false for modules with no row
    const permissions: Record<string, { CanCreate: boolean; CanRead: boolean; CanUpdate: boolean; CanDelete: boolean }> = {};
    for (const mod of modules) {
      permissions[mod.ModuleKey] = { CanCreate: false, CanRead: false, CanUpdate: false, CanDelete: false };
    }
    for (const perm of dbPerms) {
      if (perm.Module) {
        permissions[perm.Module.ModuleKey] = {
          CanCreate: perm.CanCreate,
          CanRead:   perm.CanRead,
          CanUpdate: perm.CanUpdate,
          CanDelete: perm.CanDelete,
        };
      }
    }

    // Fetch and apply User Overrides
    const overrides = await prisma.m_UserPermissionOverride.findMany({
      where: { UserId: user.userId, DeletedAt: null },
      include: { Module: { select: { ModuleKey: true } } }
    });

    for (const ovr of overrides) {
      if (ovr.Module) {
        const key = ovr.Module.ModuleKey;
        if (ovr.CanCreate !== null) permissions[key].CanCreate = ovr.CanCreate;
        if (ovr.CanRead !== null) permissions[key].CanRead = ovr.CanRead;
        if (ovr.CanUpdate !== null) permissions[key].CanUpdate = ovr.CanUpdate;
        if (ovr.CanDelete !== null) permissions[key].CanDelete = ovr.CanDelete;
      }
    }

    return applySecurityHeaders(NextResponse.json({ success: true, permissions }));
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
