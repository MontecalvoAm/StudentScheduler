import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  REFRESH_EXPIRY_SECONDS,
} from "@/lib/auth/jwt";
import { LoginSchema } from "@/lib/schemas";
import { checkLoginRateLimit } from "@/lib/security/rate-limiter";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import crypto from "crypto";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResponse = await checkLoginRateLimit(req);
  if (rateLimitResponse) return applySecurityHeaders(rateLimitResponse);

  try {
    // 2. Parse & validate body
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { Email, Password } = parsed.data;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    // 3. Look up user (include soft-deleted check)
    const user = await prisma.m_User.findFirst({
      where: { Email, DeletedAt: null },
      include: { Role: true },
    });

    // 4. Generic error — don't reveal whether email exists
    if (!user) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "INVALID_CREDENTIALS", message: "Invalid email or password" },
          { status: 401 }
        )
      );
    }

    // 5. Check account lock
    if (user.IsLocked) {
      const now = new Date();
      if (user.LockedUntil && user.LockedUntil > now) {
        const minutesLeft = Math.ceil(
          (user.LockedUntil.getTime() - now.getTime()) / 60000
        );
        await auditLog({
          userId: user.UserId,
          action: "USER_LOGIN_FAILED",
          entityType: "M_User",
          entityId: user.UserId,
          newValues: { reason: "ACCOUNT_LOCKED" },
          ipAddress: ip,
          userAgent,
        });
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: "ACCOUNT_LOCKED",
              message: `Account is locked. Try again in ${minutesLeft} minute(s).`,
            },
            { status: 403 }
          )
        );
      } else {
        // Lock period expired — reset
        await prisma.m_User.update({
          where: { UserId: user.UserId },
          data: { IsLocked: false, FailedLoginCount: 0, LockedUntil: null },
        });
      }
    }

    // 6. Verify password
    const passwordValid = await verifyPassword(Password, user.PasswordHash);
    if (!passwordValid) {
      const newFailCount = user.FailedLoginCount + 1;
      const shouldLock = newFailCount >= MAX_FAILED_ATTEMPTS;

      await prisma.m_User.update({
        where: { UserId: user.UserId },
        data: {
          FailedLoginCount: newFailCount,
          IsLocked: shouldLock,
          LockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60000)
            : null,
        },
      });

      await auditLog({
        userId: user.UserId,
        action: "USER_LOGIN_FAILED",
        entityType: "M_User",
        entityId: user.UserId,
        newValues: { failedAttempts: newFailCount, locked: shouldLock },
        ipAddress: ip,
        userAgent,
      });

      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "INVALID_CREDENTIALS",
            message: shouldLock
              ? `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts.`
              : "Invalid email or password",
          },
          { status: 401 }
        )
      );
    }

    // 7. Check if user is active
    if (!user.IsActive) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "ACCOUNT_INACTIVE", message: "Account is deactivated" },
          { status: 403 }
        )
      );
    }

    // 8. Issue tokens
    const accessToken = await signAccessToken({
      userId: user.UserId,
      role: user.Role.RoleName,
      email: user.Email,
    });

    // Store refresh token hash in DB for server-side revocation
    const refreshTokenRaw = crypto.randomBytes(64).toString("hex");
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshTokenRaw)
      .digest("hex");

    const tokenRecord = await prisma.t_RefreshToken.create({
      data: {
        UserId: user.UserId,
        TokenHash: refreshTokenHash,
        ExpiresAt: new Date(Date.now() + REFRESH_EXPIRY_SECONDS * 1000),
        IpAddress: ip,
        UserAgent: userAgent,
      },
    });

    const refreshToken = await signRefreshToken({
      userId: user.UserId,
      tokenId: tokenRecord.TokenId,
    });

    // 9. Reset failed login count + update last login
    await prisma.m_User.update({
      where: { UserId: user.UserId },
      data: {
        FailedLoginCount: 0,
        IsLocked: false,
        LockedUntil: null,
        LastLoginAt: new Date(),
      },
    });

    // 10. Set HTTP-only cookies
    await setAuthCookies(accessToken, refreshToken);

    // 11. Audit log
    await auditLog({
      userId: user.UserId,
      action: "USER_LOGIN",
      entityType: "M_User",
      entityId: user.UserId,
      ipAddress: ip,
      userAgent,
    });

    // 12. Return user info (never return PasswordHash)
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
    console.error("[Login] Error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
        { status: 500 }
      )
    );
  }
}
