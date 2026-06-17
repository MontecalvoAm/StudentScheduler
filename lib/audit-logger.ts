import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_LOCKED"
  | "USER_UNLOCKED"
  | "USER_LOGIN"
  | "USER_LOGIN_FAILED"
  | "USER_LOGOUT"
  | "PASSWORD_CHANGED"
  | "SCHEDULE_CREATED"
  | "SCHEDULE_UPDATED"
  | "SCHEDULE_DELETED"
  | "CLASS_CREATED"
  | "CLASS_UPDATED"
  | "CLASS_DELETED"
  | "ENROLLMENT_CREATED"
  | "ENROLLMENT_DROPPED"
  | "ATTENDANCE_SESSION_OPENED"
  | "ATTENDANCE_SESSION_CLOSED"
  | "ATTENDANCE_SESSION_CANCELLED"
  | "ATTENDANCE_MARKED"
  | "ATTENDANCE_OVERRIDDEN"
  | "QR_GENERATED"
  | "SUBJECT_CREATED"
  | "SUBJECT_UPDATED"
  | "ROOM_CREATED"
  | "ROOM_UPDATED"
  | "SYSTEM_SETTING_UPDATED"
  | "INSTRUCTOR_ASSIGNED"
  | "STUDENT_ENROLLED";

interface AuditLogParams {
  userId?: number | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | number | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an audit log entry. Non-blocking — failures are swallowed
 * so they don't break the primary operation.
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.t_AuditLog.create({
      data: {
        UserId: params.userId ?? null,
        Action: params.action,
        EntityType: params.entityType,
        EntityId: params.entityId != null ? String(params.entityId) : null,
        OldValues: (params.oldValues as any) ?? null,
        NewValues: (params.newValues as any) ?? null,
        IpAddress: params.ipAddress ?? null,
        UserAgent: params.userAgent?.substring(0, 500) ?? null,
      },
    });
  } catch (error) {
    // Never let audit log failure break the main flow
    console.error("[AuditLog] Failed to write audit log:", error);
  }
}

/**
 * Strip sensitive fields before logging.
 * Never log PasswordHash or MfaSecret.
 */
export function sanitizeForAudit(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const SENSITIVE_FIELDS = ["PasswordHash", "MfaSecret", "password", "token"];
  const sanitized = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }
  return sanitized;
}
