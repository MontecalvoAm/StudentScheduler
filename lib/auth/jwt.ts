import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET!
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET!
);

export const ACCESS_COOKIE = "sched_access";
export const REFRESH_COOKIE = "sched_refresh";
export const ACCESS_EXPIRY = "15m";
export const REFRESH_EXPIRY = "7d";
export const REFRESH_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ─── Payload Types ────────────────────────────────────────────────────────────
export interface AccessTokenPayload extends JWTPayload {
  userId: number;
  role: string;
  email: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  userId: number;
  tokenId: number; // references sched_RefreshTokens.TokenId
}

// ─── Token Creation ───────────────────────────────────────────────────────────
export async function signAccessToken(
  payload: Omit<AccessTokenPayload, keyof JWTPayload>
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRY)
    .setIssuer("sched-app")
    .setAudience("sched-client")
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(
  payload: Omit<RefreshTokenPayload, keyof JWTPayload>
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .setIssuer("sched-app")
    .setAudience("sched-client")
    .sign(REFRESH_SECRET);
}

// ─── Token Verification ───────────────────────────────────────────────────────
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      issuer: "sched-app",
      audience: "sched-client",
    });
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, {
      issuer: "sched-app",
      audience: "sched-client",
    });
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

// ─── Cookie Helpers (Server-Side) ─────────────────────────────────────────────
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 60 * 15, // 15 minutes
    path: "/",
  });

  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: REFRESH_EXPIRY_SECONDS,
    path: "/api/auth/refresh", // scope refresh token to refresh endpoint only
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
}

// ─── QR Code JWT ─────────────────────────────────────────────────────────────
const QR_SECRET = new TextEncoder().encode(process.env.QR_JWT_SECRET!);

export interface QrTokenPayload extends JWTPayload {
  sessionId: number;
  type: "QR_ATTENDANCE";
}

export async function signQrToken(sessionId: number): Promise<string> {
  const expiryMinutes = parseInt(
    process.env.QR_TOKEN_EXPIRY_MINUTES ?? "5",
    10
  );
  return new SignJWT({ sessionId, type: "QR_ATTENDANCE" } as QrTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiryMinutes}m`)
    .setIssuer("sched-app")
    .sign(QR_SECRET);
}

export async function verifyQrToken(
  token: string
): Promise<QrTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, QR_SECRET, {
      issuer: "sched-app",
    });
    const qrPayload = payload as QrTokenPayload;
    if (qrPayload.type !== "QR_ATTENDANCE") return null;
    return qrPayload;
  } catch {
    return null;
  }
}
