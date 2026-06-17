import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRefreshTokenFromCookies,
  clearAuthCookies,
  getAccessTokenFromCookies,
  verifyAccessToken,
} from "@/lib/auth/jwt";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function POST(req: NextRequest) {
  try {
    const accessToken = await getAccessTokenFromCookies();
    const refreshToken = await getRefreshTokenFromCookies();

    let userId: number | null = null;

    // Try to get userId from access token (may be expired, that's ok)
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      if (payload) userId = payload.userId;
    }

    // Revoke refresh token in DB
    if (refreshToken) {
      const crypto = await import("crypto");
      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await prisma.t_RefreshToken.updateMany({
        where: { TokenHash: tokenHash },
        data: { IsRevoked: true },
      });
    }

    // Clear cookies
    await clearAuthCookies();

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    if (userId) {
      await auditLog({
        userId,
        action: "USER_LOGOUT",
        entityType: "M_User",
        entityId: userId,
        ipAddress: ip,
        userAgent,
      });
    }

    return applySecurityHeaders(
      NextResponse.json({ success: true, message: "Logged out successfully" })
    );
  } catch (error) {
    console.error("[Logout] Error:", error);
    // Always clear cookies even on error
    await clearAuthCookies();
    return applySecurityHeaders(
      NextResponse.json({ success: true, message: "Logged out" })
    );
  }
}
