import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { CreateRoomSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ROLES.SUPER_ADMIN);
    const [rooms, totalRooms, activeRooms, capacityAgg, buildings] = await Promise.all([
      prisma.m_Room.findMany({
        orderBy: { RoomCode: "asc" },
      }),
      prisma.m_Room.count(),
      prisma.m_Room.count({ where: { IsActive: true } }),
      prisma.m_Room.aggregate({ _sum: { Capacity: true } }),
      prisma.m_Room.groupBy({ by: ["Building"], where: { Building: { not: null } } }),
    ]);
    return applySecurityHeaders(NextResponse.json({
      success: true,
      rooms,
      stats: {
        totalRooms,
        activeRooms,
        totalCapacity: capacityAgg._sum.Capacity ?? 0,
        totalBuildings: buildings.length,
      },
    }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ROLES.SUPER_ADMIN);
    const body = await req.json();

    const parsed = CreateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 })
      );
    }

    const { RoomCode, RoomName, Building, Capacity } = parsed.data;

    const existing = await prisma.m_Room.findUnique({
      where: { RoomCode },
    });

    if (existing) {
      return applySecurityHeaders(
        NextResponse.json({ error: "ROOM_EXISTS", message: "Room code already registered" }, { status: 409 })
      );
    }

    const room = await prisma.m_Room.create({
      data: {
        RoomCode,
        RoomName,
        Building,
        Capacity,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "ROOM_CREATED",
      entityType: "M_Room",
      entityId: room.RoomId.toString(),
      newValues: { RoomCode, RoomName, Capacity },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, room }, { status: 201 }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Rooms POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
