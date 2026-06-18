import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError , requirePermission } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";
import { UpdatePermissionsSchema } from "@/lib/schemas";

type RouteParams = { params: Promise<{ token: string }> };

// ─── PUT /api/roles/[token]/permissions ───────────────────────────────────────
// Atomically replaces the full permission matrix for a role.
// Body: { Permissions: [{ ModuleKey, CanCreate, CanRead, CanUpdate, CanDelete }] }
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await await requirePermission(req, "users", "CanUpdate");
    const { token } = await params;

    const body = await req.json();
    const parsed = UpdatePermissionsSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "VALIDATION_ERROR", issues: parsed.error.flatten().fieldErrors },
          { status: 422 }
        )
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

    const { Permissions } = parsed.data;

    // Fetch module IDs for all provided keys in one query
    const moduleKeys = Permissions.map((p) => p.ModuleKey);
    const modules = await prisma.m_Module.findMany({
      where:  { ModuleKey: { in: moduleKeys }, IsActive: true },
      select: { ModuleId: true, ModuleKey: true },
    });

    const moduleMap = new Map(modules.map((m) => [m.ModuleKey, m.ModuleId]));

    // Atomic upsert of all permission rows
    await prisma.$transaction(
      Permissions.map((perm) => {
        const moduleId = moduleMap.get(perm.ModuleKey);
        if (!moduleId) return prisma.$executeRaw`SELECT 1`; // skip unknown keys

        return prisma.m_RolePermission.upsert({
          where:  { RoleId_ModuleId: { RoleId: role.RoleId, ModuleId: moduleId } },
          update: {
            CanCreate:  perm.CanCreate,
            CanRead:    perm.CanRead,
            CanUpdate:  perm.CanUpdate,
            CanDelete:  perm.CanDelete,
            DeletedAt:  null, // restore if previously soft-deleted
          },
          create: {
            RoleId:    role.RoleId,
            ModuleId:  moduleId,
            CanCreate: perm.CanCreate,
            CanRead:   perm.CanRead,
            CanUpdate: perm.CanUpdate,
            CanDelete: perm.CanDelete,
          },
        });
      })
    );

    return applySecurityHeaders(
      NextResponse.json({ success: true, message: "Permissions updated successfully" })
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
