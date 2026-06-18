import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userToken: string }> }
) {
  try {
    const user = await requirePermission(req, "roles", "CanRead");
    const { userToken } = await params;

    const targetUser = await prisma.m_User.findUnique({
      where: { UserToken: userToken, DeletedAt: null },
      include: { Role: true },
    });

    if (!targetUser) {
      return applySecurityHeaders(NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 }));
    }

    const rolePerms = await prisma.m_RolePermission.findMany({
      where: { RoleId: targetUser.RoleId, DeletedAt: null },
      include: { Module: true },
    });

    const overrides = await prisma.m_UserPermissionOverride.findMany({
      where: { UserId: targetUser.UserId, DeletedAt: null },
      include: { Module: true },
    });

    const modules = await prisma.m_Module.findMany({
      where: { IsActive: true },
      orderBy: { SortOrder: "asc" },
    });

    const permissions: any[] = [];
    for (const mod of modules) {
      const rp = rolePerms.find((p) => p.ModuleId === mod.ModuleId);
      const ov = overrides.find((o) => o.ModuleId === mod.ModuleId);

      const resolved = {
        CanCreate: ov?.CanCreate ?? rp?.CanCreate ?? false,
        CanRead:   ov?.CanRead   ?? rp?.CanRead   ?? false,
        CanUpdate: ov?.CanUpdate ?? rp?.CanUpdate ?? false,
        CanDelete: ov?.CanDelete ?? rp?.CanDelete ?? false,
      };

      permissions.push({
        ModuleKey: mod.ModuleKey,
        ModuleLabel: mod.ModuleLabel,
        RolePerms: {
          CanCreate: rp?.CanCreate ?? false,
          CanRead:   rp?.CanRead ?? false,
          CanUpdate: rp?.CanUpdate ?? false,
          CanDelete: rp?.CanDelete ?? false,
        },
        Overrides: {
          CanCreate: ov?.CanCreate ?? null,
          CanRead:   ov?.CanRead ?? null,
          CanUpdate: ov?.CanUpdate ?? null,
          CanDelete: ov?.CanDelete ?? null,
        },
        Resolved: resolved,
      });
    }

    return applySecurityHeaders(NextResponse.json({ success: true, permissions }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode }));
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userToken: string }> }
) {
  try {
    const user = await requirePermission(req, "roles", "CanUpdate");
    const { userToken } = await params;
    const { Overrides } = await req.json();

    const targetUser = await prisma.m_User.findUnique({
      where: { UserToken: userToken, DeletedAt: null },
    });

    if (!targetUser) {
      return applySecurityHeaders(NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 }));
    }

    await prisma.$transaction(async (tx) => {
      // For each override in payload
      for (const ov of Overrides) {
        const mod = await tx.m_Module.findUnique({ where: { ModuleKey: ov.ModuleKey } });
        if (!mod) continue;

        if (ov.CanCreate === null && ov.CanRead === null && ov.CanUpdate === null && ov.CanDelete === null) {
          // Delete override if it exists
          await tx.m_UserPermissionOverride.deleteMany({
            where: { UserId: targetUser.UserId, ModuleId: mod.ModuleId },
          });
        } else {
          // Upsert
          await tx.m_UserPermissionOverride.upsert({
            where: { UserId_ModuleId: { UserId: targetUser.UserId, ModuleId: mod.ModuleId } },
            create: {
              UserId: targetUser.UserId,
              ModuleId: mod.ModuleId,
              CanCreate: ov.CanCreate,
              CanRead: ov.CanRead,
              CanUpdate: ov.CanUpdate,
              CanDelete: ov.CanDelete,
              CreatedBy: user.userId,
            },
            update: {
              CanCreate: ov.CanCreate,
              CanRead: ov.CanRead,
              CanUpdate: ov.CanUpdate,
              CanDelete: ov.CanDelete,
              UpdatedBy: user.userId,
            },
          });
        }
      }
    });

    return applySecurityHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode }));
    }
    return applySecurityHeaders(NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }));
  }
}
