import { NextRequest } from "next/server";
import { verifyAccessToken, AccessTokenPayload } from "@/lib/auth/jwt";

// ─── Role Constants ───────────────────────────────────────────────────────────
export const ROLES = {
  STUDENT: "STUDENT",
  INSTRUCTOR: "INSTRUCTOR",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role hierarchy: higher index = more privilege
const ROLE_HIERARCHY: Role[] = [
  ROLES.STUDENT,
  ROLES.INSTRUCTOR,
  ROLES.SUPER_ADMIN,
];

export function hasMinimumRole(userRole: string, minimumRole: Role): boolean {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole as Role);
  const minIdx = ROLE_HIERARCHY.indexOf(minimumRole);
  return userIdx >= minIdx;
}

// ─── Route Permission Matrix ──────────────────────────────────────────────────
export const ROUTE_PERMISSIONS: Record<string, Role> = {
  "/dashboard/student": ROLES.STUDENT,
  "/dashboard/instructor": ROLES.INSTRUCTOR,
  "/dashboard/admin": ROLES.SUPER_ADMIN,
  "/api/admin": ROLES.SUPER_ADMIN,
  "/api/attendance/session": ROLES.INSTRUCTOR,
  "/api/attendance/override": ROLES.INSTRUCTOR,
  "/api/reports": ROLES.INSTRUCTOR,
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
