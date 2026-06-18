import { NextRequest } from "next/server";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth/jwt";

// ─── Role Constants ───────────────────────────────────────────────────────────
export const ROLES = {
  STUDENT: "STUDENT",
  INSTRUCTOR: "INSTRUCTOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role hierarchy: higher index = more privilege
const ROLE_HIERARCHY: Role[] = [
  ROLES.STUDENT,
  ROLES.INSTRUCTOR,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

export function hasMinimumRole(userRole: string, minimumRole: Role): boolean {
  if (userRole === ROLES.SUPER_ADMIN) return true;
  
  const userIdx = ROLE_HIERARCHY.indexOf(userRole as Role);
  const minIdx = ROLE_HIERARCHY.indexOf(minimumRole);

  // If role is not in standard hierarchy (custom role), treat as ADMIN-level for base routing
  // Granular access is still enforced by requirePermission() on the API routes
  if (userIdx === -1) {
    return ROLE_HIERARCHY.indexOf(ROLES.ADMIN) >= minIdx;
  }

  return userIdx >= minIdx;
}

// ─── Route Permission Matrix ──────────────────────────────────────────────────
export const ROUTE_PERMISSIONS: Record<string, Role> = {
  "/dashboard/student": ROLES.STUDENT,
  "/dashboard/instructor": ROLES.INSTRUCTOR,
};

// ─── Server-Side Auth Guard ───────────────────────────────────────────────────
/**
 * Use inside Server Components and API Route handlers.
 * Never trust middleware alone — always re-validate on the server.
 */
export async function getAuthUser(
  req?: NextRequest
): Promise<AccessTokenPayload | null> {
  let token: string | undefined;

  if (req) {
    // API route context
    token = req.cookies.get("sched_access")?.value;
  } else {
    // Server component context
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    token = cookieStore.get("sched_access")?.value;
  }

  if (!token) return null;
  return verifyAccessToken(token);
}

/**
 * Guard factory for API routes.
 * Usage: const user = await requireRole(req, ROLES.INSTRUCTOR);
 */
export async function requireRole(
  req: NextRequest,
  role: Role
): Promise<AccessTokenPayload> {
  const user = await getAuthUser(req);

  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Authentication required", 401);
  }

  if (!hasMinimumRole(user.role, role)) {
    throw new AuthError(
      "FORBIDDEN",
      "You do not have permission to access this resource",
      403
    );
  }

  return user;
}

/**
 * Permission guard that checks granular RBAC module permissions.
 * SUPER_ADMIN bypasses this check entirely.
 * Usage: const user = await requirePermission(req, "users", "CanRead");
 */
export async function requirePermission(
  req: NextRequest,
  moduleKey: string,
  action: "CanRead" | "CanCreate" | "CanUpdate" | "CanDelete"
): Promise<AccessTokenPayload> {
  const user = await getAuthUser(req);

  if (!user) {
    throw new AuthError("UNAUTHORIZED", "Authentication required", 401);
  }

  // SUPER_ADMIN always has full access — skip DB lookup
  if (user.role === ROLES.SUPER_ADMIN) return user;

  // Lazy import prisma to keep this module lean
  const { prisma } = await import("@/lib/prisma");

  const roleRow = await prisma.m_Role.findFirst({
    where: { RoleName: user.role, DeletedAt: null },
    select: { RoleId: true },
  });

  if (!roleRow) {
    throw new AuthError("FORBIDDEN", "Role not found", 403);
  }

  const permission = await prisma.m_RolePermission.findFirst({
    where: {
      RoleId:  roleRow.RoleId,
      Module:  { ModuleKey: moduleKey, IsActive: true },
      DeletedAt: null,
    },
    select: {
      CanCreate: true,
      CanRead:   true,
      CanUpdate: true,
      CanDelete: true,
      ModuleId:  true,
    },
  });

  let resolvedPerm = permission ? { ...permission } : { CanCreate: false, CanRead: false, CanUpdate: false, CanDelete: false, ModuleId: null };

  // If a role permission exists or we want to allow user overrides even if the role doesn't have a row
  // We need to fetch the ModuleId first if not available
  let modId = resolvedPerm.ModuleId;
  if (!modId) {
    const mod = await prisma.m_Module.findFirst({ where: { ModuleKey: moduleKey, IsActive: true }, select: { ModuleId: true } });
    if (mod) modId = mod.ModuleId;
  }

  if (modId) {
    const override = await prisma.m_UserPermissionOverride.findUnique({
      where: { UserId_ModuleId: { UserId: user.userId, ModuleId: modId } },
      select: { CanCreate: true, CanRead: true, CanUpdate: true, CanDelete: true }
    });

    if (override) {
      if (override.CanCreate !== null) resolvedPerm.CanCreate = override.CanCreate;
      if (override.CanRead !== null) resolvedPerm.CanRead = override.CanRead;
      if (override.CanUpdate !== null) resolvedPerm.CanUpdate = override.CanUpdate;
      if (override.CanDelete !== null) resolvedPerm.CanDelete = override.CanDelete;
    }
  }

  if (!resolvedPerm || !resolvedPerm[action]) {
    throw new AuthError(
      "FORBIDDEN",
      `You do not have ${action} permission on module '${moduleKey}'`,
      403
    );
  }

  return user;
}

// ─── Auth Error ───────────────────────────────────────────────────────────────
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
