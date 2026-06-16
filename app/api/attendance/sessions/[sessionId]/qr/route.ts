import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await requireRole(req, ROLES.INSTRUCTOR);
    const { sessionId } = await params;

    const sId = parseInt(sessionId, 10);
    if (isNaN(sId)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "INVALID_SESSION_ID" }, { status: 400 })
      );
    }

    const session = await prisma.sched_AttendanceSessions.findFirst({
      where: {
        SessionId: sId,
        ...(user.role === ROLES.INSTRUCTOR && {
          Schedule: {
            Class: {
              ClassAssignments: {
                some: {
                  Instructor: { UserId: user.userId },
                  RemovedAt: null,
                },
              },
            },
          },
        }),
      },
    });

    if (!session || !session.QrCodeToken) {
      return applySecurityHeaders(
        NextResponse.json({ error: "QR_NOT_FOUND", message: "No active QR code token found for this session" }, { status: 404 })
      );
    }

    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(session.QrCodeToken, {
      width: 300,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    });

    return applySecurityHeaders(
      NextResponse.json({ success: true, QrCodeDataUrl: qrCodeDataUrl })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Session QR GET] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
