import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/** Login: 5 attempts per 15 minutes per IP */
export const loginRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "sched:rl:login",
});

/** General API: 100 requests per minute per authenticated user */
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "sched:rl:api",
});

/** Password reset: 3 per hour per IP */
export const passwordResetRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "sched:rl:password_reset",
});

// ─── Rate Limit Middleware Helper ─────────────────────────────────────────────
export async function checkLoginRateLimit(
  req: NextRequest
): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { success, limit, reset, remaining } = await loginRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      {
        error: "TOO_MANY_REQUESTS",
        message: "Too many login attempts. Please try again later.",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

export async function checkApiRateLimit(
  req: NextRequest,
  identifier: string
): Promise<NextResponse | null> {
  const { success, limit, reset, remaining } = await apiRateLimiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        error: "TOO_MANY_REQUESTS",
        message: "API rate limit exceeded. Please slow down.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  return null;
}
