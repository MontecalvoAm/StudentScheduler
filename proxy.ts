import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { applySecurityHeaders } from "@/lib/security/headers";
import { setCsrfCookie } from "@/lib/security/csrf";
import { ROLES, ROUTE_PERMISSIONS, hasMinimumRole } from "@/lib/auth/rbac";

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/refresh",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function getRequiredRole(pathname: string) {
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length) // longest match first
    .find((route) => pathname.startsWith(route));
  return matchedRoute ? ROUTE_PERMISSIONS[matchedRoute] : null;
}

function getRoleDashboard(role: string): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return "/dashboard/admin";
    case ROLES.INSTRUCTOR:
      return "/dashboard/instructor";
    case ROLES.STUDENT:
    default:
      return "/dashboard/student";
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Verify access token from HTTP-only cookie
  const accessToken = req.cookies.get("sched_access")?.value;
  let user = null;

  if (accessToken) {
    user = await verifyAccessToken(accessToken);
  }

  // 2. If authenticated user visits /login or /, redirect to their dashboard
  if (user && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(
      new URL(getRoleDashboard(user.role), req.url)
    );
  }

  // 3. Allow public paths through
  if (isPublicPath(pathname)) {
    let response = NextResponse.next();
    response = await setCsrfCookie(response);
    return applySecurityHeaders(response);
  }

  // 4. If not authenticated, redirect to login
  if (!user) {
    if (pathname.startsWith("/api/")) {
      let response = NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      );
      return applySecurityHeaders(response);
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-based route authorization
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole && !hasMinimumRole(user.role, requiredRole)) {
    if (pathname.startsWith("/api/")) {
      let response = NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        },
        { status: 403 }
      );
      return applySecurityHeaders(response);
    }
    // Redirect to their own dashboard
    return NextResponse.redirect(
      new URL(getRoleDashboard(user.role), req.url)
    );
  }

  // 7. Attach user info to request headers for Server Components / API routes
  let response = NextResponse.next();
  response.headers.set("x-user-id", String(user.userId));
  response.headers.set("x-user-role", user.role);
  response.headers.set("x-user-email", user.email);

  // 8. Refresh CSRF cookie on each authenticated request
  response = await setCsrfCookie(response);

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
