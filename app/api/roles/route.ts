import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError , requirePermission } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";
import { CreateRoleSchema } from "@/lib/schemas";

// ─── GET /api/roles ───────────────────────────────────────────────────────────
// Returns all non-deleted roles with user counts. Uses RoleToken as public ID.
export async function GET(req: NextRequest) {
  try {
    await await requirePermission(req, "users", "CanRead");

    const roles = await prisma.m_Role.findMany({
      where:   { DeletedAt: null },
      include: {
        _count:      { select: { Users: true } },
        Permissions: {
          where:   { DeletedAt: null },
          include: { Module: { select: { ModuleKey: true, ModuleLabel: true } } },
        },
      },
      orderBy: { RoleId: "asc" },
    });

    // Strip internal IDs — expose only RoleToken as the public identifier
    const safeRoles = roles.map((role) => ({
      RoleToken:   role.RoleToken,
      RoleName:    role.RoleName,
      Description: role.Description,
      IsSystem:    role.IsSystem,
      UserCount:   role._count.Users,
      Permissions: role.Permissions.map((p) => ({
        PermissionToken: p.PermissionToken,
        ModuleKey:       p.Module.ModuleKey,
        ModuleLabel:     p.Module.ModuleLabel,
        CanCreate:       p.CanCreate,
        CanRead:         p.CanRead,
        CanUpdate:       p.CanUpdate,
        CanDelete:       p.CanDelete,
      })),
    }));

    return applySecurityHeaders(NextResponse.json({ success: true, roles: safeRoles }));
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

// ─── POST /api/roles ──────────────────────────────────────────────────────────
// Create a new custom role with optional initial permissions.
export async function POST(req: NextRequest) {
  try {
    await await requirePermission(req, "users", "CanCreate");

    const body = await req.json();
    const parsed = CreateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten().fieldErrors }, { status: 422 })
      );
    }

    const { RoleName, Description, Permissions } = parsed.data;

    // Check for duplicate name
    const existing = await prisma.m_Role.findFirst({ where: { RoleName, DeletedAt: null } });
    if (existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "CONFLICT", message: `Role '${RoleName}' already exists` }, { status: 409 })
      );
    }

    // Build permissions upsert data if provided
    const newRole = await prisma.$transaction(async (tx) => {
      const role = await tx.m_Role.create({
        data: { RoleName, Description, IsSystem: false },
      });

      if (Permissions && Permissions.length > 0) {
        for (const perm of Permissions) {
          const mod = await tx.m_Module.findUnique({ where: { ModuleKey: perm.ModuleKey } });
          if (!mod) continue;
          await tx.m_RolePermission.create({
            data: {
              RoleId:    role.RoleId,
              ModuleId:  mod.ModuleId,
              CanCreate: perm.CanCreate,
              CanRead:   perm.CanRead,
              CanUpdate: perm.CanUpdate,
              CanDelete: perm.CanDelete,
            },
          });
        }
      } else {
        // Default: create all-false permission rows for every module
        const modules = await tx.m_Module.findMany({ where: { IsActive: true } });
        for (const mod of modules) {
          await tx.m_RolePermission.create({
            data: {
              RoleId:    role.RoleId,
              ModuleId:  mod.ModuleId,
              CanCreate: false,
              CanRead:   false,
              CanUpdate: false,
              CanDelete: false,
            },
          });
        }
      }

      return role;
    });

    return applySecurityHeaders(
      NextResponse.json({ success: true, RoleToken: newRole.RoleToken }, { status: 201 })
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
