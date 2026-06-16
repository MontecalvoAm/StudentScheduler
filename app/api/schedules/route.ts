import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES, AuthError } from "@/lib/auth/rbac";
import { CreateScheduleSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit-logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ROLES.SUPER_ADMIN);
    const schedules = await prisma.sched_Schedules.findMany({
      where: { IsActive: true },
      include: {
        Class: {
          include: {
            Subject: true,
          },
        },
        Room: true,
      },
      orderBy: [
        { DayOfWeek: "asc" },
        { StartTime: "asc" },
      ],
    });
    return applySecurityHeaders(NextResponse.json({ success: true, schedules }));
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

    const parsed = CreateScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ error: "VALIDATION_ERROR", issues: parsed.error.flatten() }, { status: 400 })
      );
    }

    const { ClassId, RoomId, DayOfWeek, StartTime, EndTime, EffectiveFrom, EffectiveTo } = parsed.data;

    // 1. Room Overlap Check
    const roomOverlap = await prisma.sched_Schedules.findFirst({
      where: {
        RoomId,
        DayOfWeek,
        IsActive: true,
        // (StartTime1 < EndTime2) AND (StartTime2 < EndTime1)
        StartTime: { lt: EndTime },
        EndTime: { gt: StartTime },
      },
      include: {
        Class: { include: { Subject: true } },
      },
    });

    if (roomOverlap) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "ROOM_CONFLICT",
            message: `Room is already booked for ${roomOverlap.Class.Subject.SubjectCode} (${roomOverlap.StartTime} - ${roomOverlap.EndTime}) on this day.`,
          },
          { status: 409 }
        )
      );
    }

    // 2. Instructor Overlap Check
    // Get the instructors assigned to the current class
    const assignments = await prisma.sched_ClassAssignments.findMany({
      where: { ClassId, RemovedAt: null },
      select: { InstructorId: true },
    });

    const instructorIds = assignments.map((a) => a.InstructorId);

    if (instructorIds.length > 0) {
      const instructorOverlap = await prisma.sched_Schedules.findFirst({
        where: {
          DayOfWeek,
          IsActive: true,
          StartTime: { lt: EndTime },
          EndTime: { gt: StartTime },
          Class: {
            ClassAssignments: {
              some: {
                InstructorId: { in: instructorIds },
                RemovedAt: null,
              },
            },
          },
        },
        include: {
          Class: { include: { Subject: true } },
        },
      });

      if (instructorOverlap) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: "INSTRUCTOR_CONFLICT",
              message: `Assigned instructor has an overlapping class schedule: ${instructorOverlap.Class.Subject.SubjectCode} (${instructorOverlap.StartTime} - ${instructorOverlap.EndTime}).`,
            },
            { status: 409 }
          )
        );
      }
    }

    // 3. Create Schedule
    const schedule = await prisma.sched_Schedules.create({
      data: {
        ClassId,
        RoomId,
        DayOfWeek,
        StartTime,
        EndTime,
        EffectiveFrom: new Date(EffectiveFrom),
        EffectiveTo: EffectiveTo ? new Date(EffectiveTo) : null,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await auditLog({
      userId: user.userId,
      action: "SCHEDULE_CREATED",
      entityType: "sched_Schedules",
      entityId: schedule.ScheduleId.toString(),
      newValues: { ClassId, RoomId, DayOfWeek, StartTime, EndTime },
      ipAddress: ip,
    });

    return applySecurityHeaders(NextResponse.json({ success: true, schedule }, { status: 201 }));
  } catch (error) {
    if (error instanceof AuthError) {
      return applySecurityHeaders(
        NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode })
      );
    }
    console.error("[Schedules POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 })
    );
  }
}
