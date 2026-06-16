import { NextRequest, NextResponse } from "next/server";

const CSRF_SECRET = process.env.CSRF_SECRET!;
const CSRF_COOKIE = "sched_csrf";
const CSRF_HEADER = "x-csrf-token";
const CSRF_TOKEN_TTL = 3600; // 1 hour in seconds

// Helper to sign a payload using Web Crypto API (supported in Edge Runtime)
async function signHmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Generate CSRF Token ──────────────────────────────────────────────────────
export async function generateCsrfToken(): Promise<string> {
  const randomBuffer = new Uint8Array(16);
  crypto.getRandomValues(randomBuffer);
  const nonce = Array.from(randomBuffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${nonce}.${timestamp}`;
  const signature = await signHmacSha256(payload, CSRF_SECRET);
  return `${payload}.${signature}`;
}

// ─── Validate CSRF Token ──────────────────────────────────────────────────────
export async function validateCsrfToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [nonce, timestampStr, signature] = parts;
    const payload = `${nonce}.${timestampStr}`;

    const expectedSig = await signHmacSha256(payload, CSRF_SECRET);
    if (signature !== expectedSig) return false;

    // Verify expiry
    const timestamp = parseInt(timestampStr, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > CSRF_TOKEN_TTL) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── Middleware CSRF Check ────────────────────────────────────────────────────
export async function checkCsrf(req: NextRequest): Promise<NextResponse | null> {
  const method = req.method.toUpperCase();

  // Only check state-mutating methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  // Skip CSRF for auth endpoints (they use rate limiting instead)
  if (req.nextUrl.pathname.startsWith("/api/auth/")) return null;

  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: "CSRF_VALIDATION_FAILED", message: "CSRF token validation failed" },
      { status: 403 }
    );
  }

  const isValid = await validateCsrfToken(cookieToken);
  if (!isValid) {
    return NextResponse.json(
      { error: "CSRF_TOKEN_INVALID", message: "CSRF token is invalid or expired" },
      { status: 403 }
    );
  }

  return null;
}

// ─── Set CSRF Cookie ──────────────────────────────────────────────────────────
export async function setCsrfCookie(response: NextResponse): Promise<NextResponse> {
  const token = await generateCsrfToken();
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by JavaScript to send in header
    secure: isProduction,
    sameSite: "strict",
    maxAge: CSRF_TOKEN_TTL,
    path: "/",
  });

  return response;
}

export { CSRF_COOKIE, CSRF_HEADER };
