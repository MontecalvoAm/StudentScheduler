import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError , requirePermission } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";
import { UpdateRoleSchema } from "@/lib/schemas";

type RouteParams = { params: Promise<{ token: string }> };

// ─── GET /api/roles/[token] ───────────────────────────────────────────────────
// Returns a single role with its full permission matrix across all active modules.
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await await requirePermission(req, "users", "CanRead");
    const { token } = await params;

    const role = await prisma.m_Role.findFirst({
      where:   { RoleToken: token, DeletedAt: null },
      include: {
        _count:      { select: { Users: true } },
        Permissions: {
          where:   { DeletedAt: null },
          include: { Module: { select: { ModuleKey: true, ModuleLabel: true, SortOrder: true } } },
        },
      },
    });

    if (!role) {
      return applySecurityHeaders(
        NextResponse.json({ error: "NOT_FOUND", message: "Role not found" }, { status: 404 })
      );
    }

    // Fetch all modules to guarantee full matrix even for new roles with missing rows
    const allModules = await prisma.m_Module.findMany({
      where:   { IsActive: true },
      orderBy: { SortOrder: "asc" },
    });

    const permMap = new Map(
      role.Permissions.map((p) => [p.Module.ModuleKey, p])
    );

    const matrix = allModules.map((mod) => {
      const perm = permMap.get(mod.ModuleKey);
      return {
        ModuleKey:   mod.ModuleKey,
        ModuleLabel: mod.ModuleLabel,
        CanCreate:   perm?.CanCreate ?? false,
        CanRead:     perm?.CanRead   ?? false,
        CanUpdate:   perm?.CanUpdate ?? false,
        CanDelete:   perm?.CanDelete ?? false,
      };
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        role: {
          RoleToken:   role.RoleToken,
          RoleName:    role.RoleName,
          Description: role.Description,
          IsSystem:    role.IsSystem,
          UserCount:   role._count.Users,
          Permissions: matrix,
        },
      })
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

// ─── PATCH /api/roles/[token] ─────────────────────────────────────────────────
// Update role name and/or description. IsSystem roles are protected from rename.
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await await requirePermission(req, "users", "CanUpdate");
    const { token } = await params;

    const body = await req.json();
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten().fieldErrors }, { status: 422 })
      );
    }

    const role = await prisma.m_Role.findFirst({
      where: { RoleToken: token, DeletedAt: null },
    });

    if (!role) {
      return applySecurityHeaders(
        NextResponse.json({ error: "NOT_FOUND", message: "Role not found" }, { status: 404 })
      );
    }

    if (role.IsSystem && parsed.data.RoleName && parsed.data.RoleName !== role.RoleName) {
      return applySecurityHeaders(
        NextResponse.json({ error: "FORBIDDEN", message: "System roles cannot be renamed" }, { status: 403 })
      );
    }

    const updated = await prisma.m_Role.update({
      where: { RoleToken: token },
      data:  { ...parsed.data },
    });

    return applySecurityHeaders(
      NextResponse.json({ success: true, RoleToken: updated.RoleToken })
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

// ─── DELETE /api/roles/[token] ────────────────────────────────────────────────
// Soft-deletes a role. Guards: IsSystem roles are immutable; active users block deletion.
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await await requirePermission(req, "users", "CanDelete");
    const { token } = await params;

    const role = await prisma.m_Role.findFirst({
      where:   { RoleToken: token, DeletedAt: null },
      include: { _count: { select: { Users: { where: { DeletedAt: null } } } } },
    });

    if (!role) {
      return applySecurityHeaders(
        NextResponse.json({ error: "NOT_FOUND", message: "Role not found" }, { status: 404 })
      );
    }

    if (role.IsSystem) {
      return applySecurityHeaders(
        NextResponse.json({ error: "FORBIDDEN", message: "System roles cannot be deleted" }, { status: 403 })
      );
    }

    if (role._count.Users > 0) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:     "CONFLICT",
            message:   `Cannot delete role: ${role._count.Users} active user(s) are assigned to it. Reassign them first.`,
            UserCount: role._count.Users,
          },
          { status: 409 }
        )
      );
    }

    const now = new Date();
    await prisma.$transaction([
      // Soft-delete the role
      prisma.m_Role.update({
        where: { RoleToken: token },
        data:  { DeletedAt: now },
      }),
      // Soft-delete all associated permission rows
      prisma.m_RolePermission.updateMany({
        where: { RoleId: role.RoleId, DeletedAt: null },
        data:  { DeletedAt: now },
      }),
    ]);

    return applySecurityHeaders(
      NextResponse.json({ success: true, message: "Role soft-deleted successfully" })
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
