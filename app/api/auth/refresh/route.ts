import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRefreshTokenFromCookies,
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  REFRESH_EXPIRY_SECONDS,
} from "@/lib/auth/jwt";
import { applySecurityHeaders } from "@/lib/security/headers";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = await getRefreshTokenFromCookies();

    if (!refreshToken) {
      await clearAuthCookies();
      return applySecurityHeaders(
        NextResponse.json(
          { error: "UNAUTHORIZED", message: "No refresh token" },
          { status: 401 }
        )
      );
    }

    // Verify JWT signature and expiry
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      await clearAuthCookies();
      return applySecurityHeaders(
        NextResponse.json(
          { error: "UNAUTHORIZED", message: "Invalid or expired refresh token" },
          { status: 401 }
        )
      );
    }

    // Verify token exists in DB and is not revoked
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const storedToken = await prisma.t_RefreshToken.findUnique({
      where: { TokenHash: tokenHash },
      include: { User: { include: { Role: true } } },
    });

    if (!storedToken || storedToken.IsRevoked || storedToken.ExpiresAt < new Date()) {
      await clearAuthCookies();
      return applySecurityHeaders(
        NextResponse.json(
          { error: "UNAUTHORIZED", message: "Token has been revoked" },
          { status: 401 }
        )
      );
    }

    // Check user is still active
    const user = storedToken.User;
    if (!user.IsActive || user.IsLocked || user.DeletedAt) {
      await clearAuthCookies();
      return applySecurityHeaders(
        NextResponse.json(
          { error: "ACCOUNT_INACTIVE", message: "Account is not active" },
          { status: 403 }
        )
      );
    }

    // TOKEN ROTATION: revoke old token, issue new pair
    await prisma.t_RefreshToken.update({
      where: { TokenId: storedToken.TokenId },
      data: { IsRevoked: true },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    const newRefreshTokenRaw = crypto.randomBytes(64).toString("hex");
    const newRefreshTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshTokenRaw)
      .digest("hex");

    const newTokenRecord = await prisma.t_RefreshToken.create({
      data: {
        UserId: user.UserId,
        TokenHash: newRefreshTokenHash,
        ExpiresAt: new Date(Date.now() + REFRESH_EXPIRY_SECONDS * 1000),
        IpAddress: ip,
        UserAgent: userAgent,
      },
    });

    const newAccessToken = await signAccessToken({
      userId: user.UserId,
      role: user.Role.RoleName,
      email: user.Email,
    });

    const newRefreshToken = await signRefreshToken({
      userId: user.UserId,
      tokenId: newTokenRecord.TokenId,
    });

    await setAuthCookies(newAccessToken, newRefreshToken);

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        user: {
          UserId: user.UserId,
          Email: user.Email,
          FirstName: user.FirstName,
          LastName: user.LastName,
          Role: user.Role.RoleName,
        },
      })
    );
  } catch (error) {
    console.error("[Refresh] Error:", error);
    await clearAuthCookies();
    return applySecurityHeaders(
      NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Token refresh failed" },
        { status: 500 }
      )
    );
  }
}
