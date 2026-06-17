import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ROLES.SUPER_ADMIN);

    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { Action: { contains: search } },
            { EntityType: { contains: search } },
            { EntityId: { contains: search } },
            { User: { Email: { contains: search } } },
          ],
        }
      : {};

    const [total, logs] = await prisma.$transaction([
      prisma.t_AuditLog.count({ where }),
      prisma.t_AuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { CreatedAt: "desc" },
        include: {
          User: {
            select: { FirstName: true, LastName: true, Email: true },
          },
        },
      }),
    ]);

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Audit Logs GET] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
