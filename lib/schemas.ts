import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  Email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255),
  Password: z
    .string()
    .min(1, "Password is required")
    .max(128),
});

export const ChangePasswordSchema = z
  .object({
    CurrentPassword: z.string().min(1, "Current password is required"),
    NewPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    ConfirmPassword: z.string(),
  })
  .refine((data) => data.NewPassword === data.ConfirmPassword, {
    message: "Passwords do not match",
    path: ["ConfirmPassword"],
  });

// ─── User Management ──────────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  Email: z.string().email().max(255),
  FirstName: z.string().min(1).max(100),
  LastName: z.string().min(1).max(100),
  MiddleName: z.string().max(100).optional(),
  RoleId: z.number().int().positive(),
  Password: z.string().min(8, "Password must be at least 8 characters").max(128),
  // Role-specific
  StudentNumber: z.string().max(50).optional(),
  EmployeeNumber: z.string().max(50).optional(),
  CourseToken: z.string().optional(),
  YearLevel: z.number().int().min(1).max(6).optional(),
  Section: z.string().max(20).optional(),
  StudySession: z.enum(["DAY", "NIGHT"]).optional().nullable(),
  Department: z.string().max(100).optional(),
  DepartmentToken: z.string().optional().nullable(),
});

export const UpdateUserSchema = z.object({
  Email: z.string().email().max(255).optional().nullable(),
  FirstName: z.string().min(1).max(100).optional(),
  LastName: z.string().min(1).max(100).optional(),
  MiddleName: z.string().max(100).optional().nullable(),
  RoleId: z.number().int().positive().optional(),
  IsActive: z.boolean().optional(),
  IsLocked: z.boolean().optional(),
  Password: z.string().min(8).max(128).optional().nullable(),
  CourseToken: z.string().optional().nullable(),
  YearLevel: z.number().int().min(1).max(6).optional().nullable(),
  Section: z.string().max(20).optional().nullable(),
  StudySession: z.enum(["DAY", "NIGHT"]).optional().nullable(),
  Department: z.string().max(100).optional().nullable(),
  DepartmentToken: z.string().optional().nullable(),
  StudentNumber: z.string().max(50).optional().nullable(),
  EmployeeNumber: z.string().max(50).optional().nullable(),
});

// ─── Role Management ────────────────────────────────────────────────────────────────────────────────────
export const PermissionEntrySchema = z.object({
  ModuleKey: z.string().min(1).max(50),
  CanCreate: z.boolean(),
  CanRead:   z.boolean(),
  CanUpdate: z.boolean(),
  CanDelete: z.boolean(),
});

export const CreateRoleSchema = z.object({
  RoleName:    z.string().min(1).max(50).toUpperCase(),
  Description: z.string().max(255).optional(),
  Permissions: z.array(PermissionEntrySchema).optional(),
});

export const UpdateRoleSchema = z.object({
  RoleName:    z.string().min(1).max(50).toUpperCase().optional(),
  Description: z.string().max(255).optional().nullable(),
});

export const UpdatePermissionsSchema = z.object({
  Permissions: z.array(PermissionEntrySchema).min(1),
});


// ─── Academic Structure ───────────────────────────────────────────────────────
export const CreateSchoolYearSchema = z
  .object({
    YearLabel: z
      .string()
      .regex(/^\d{4}-\d{4}$/, 'Format must be "YYYY-YYYY"')
      .max(20),
    StartDate: z.coerce.date(),
    EndDate: z.coerce.date(),
  })
  .refine((data) => data.StartDate < data.EndDate, {
    message: "StartDate must be before EndDate",
    path: ["EndDate"],
  });

export const CreateSemesterSchema = z
  .object({
    SchoolYearId: z.number().int().positive(),
    SemesterName: z
      .enum(["First Semester", "Second Semester", "Summer"])
      .or(z.string().min(1).max(50)),
    StartDate: z.coerce.date(),
    EndDate: z.coerce.date(),
  })
  .refine((data) => data.StartDate < data.EndDate, {
    message: "StartDate must be before EndDate",
    path: ["EndDate"],
  });

export const CreateCourseSchema = z.object({
  CourseCode: z.string().min(1).max(20).toUpperCase(),
  CourseName: z.string().min(1).max(200),
  Description: z.string().max(2000).optional(),
  DepartmentToken: z.string().optional().nullable(),
});

export const CreateSubjectSchema = z.object({
  CourseId: z.number().int().positive().optional().nullable(),
  SubjectCode: z.string().min(1).max(20).toUpperCase(),
  SubjectName: z.string().min(1).max(200),
  Units: z.number().int().min(1).max(10).default(3),
  Description: z.string().max(2000).optional(),
});

export const CreateRoomSchema = z.object({
  RoomCode: z.string().min(1).max(30),
  RoomName: z.string().min(1).max(100),
  Building: z.string().max(100).optional(),
  Capacity: z.number().int().min(1).max(500).default(40),
});

export const CreateClassSchema = z.object({
  SubjectId: z.number().int().positive(),
  SemesterId: z.number().int().positive(),
  SectionCode: z.string().min(1).max(30),
  StudySession: z.enum(["DAY", "NIGHT"]).optional().nullable(),
  MaxStudents: z.number().int().min(1).max(500).default(40),
});

export const CreateScheduleSchema = z
  .object({
    ClassId: z.number().int().positive(),
    RoomId: z.number().int().positive(),
    DayOfWeek: z.number().int().min(0).max(6),
    StartTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    EndTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    EffectiveFrom: z.coerce.date(),
    EffectiveTo: z.coerce.date().optional().nullable(),
  })
  .refine((data) => data.StartTime < data.EndTime, {
    message: "StartTime must be before EndTime",
    path: ["EndTime"],
  });

export const EnrollStudentSchema = z.object({
  StudentId: z.number().int().positive(),
  ClassId: z.number().int().positive(),
});

export const AssignInstructorSchema = z.object({
  InstructorId: z.number().int().positive(),
  ClassId: z.number().int().positive(),
  IsPrimary: z.boolean().default(true),
});

// ─── Attendance ───────────────────────────────────────────────────────────────
export const OpenAttendanceSessionSchema = z.object({
  ScheduleId: z.number().int().positive(),
  SessionDate: z.coerce.date(),
  Method: z.enum(["BUTTON", "QR", "BOTH"]).default("BUTTON"),
  AutoCloseMinutes: z.number().int().min(5).max(180).optional().nullable(),
});

export const MarkAttendanceSchema = z.object({
  SessionId: z.number().int().positive(),
});

export const MarkAttendanceQrSchema = z.object({
  QrToken: z.string().min(1),
});

export const OverrideAttendanceSchema = z.object({
  Status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]),
  Remarks: z.string().max(500).optional(),
});

// ─── Pagination / Query Params ────────────────────────────────────────────────
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UserListQuerySchema = PaginationSchema.extend({
  search: z.string().max(100).optional(),
  roleToken: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  yearLevel: z.coerce.number().int().min(1).max(6).optional(),
  section: z.string().max(20).optional(),
  studySession: z.enum(["DAY", "NIGHT"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const SubjectListQuerySchema = PaginationSchema.extend({
  search: z.string().max(100).optional(),
  courseId: z.coerce.number().int().positive().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const AttendanceReportQuerySchema = PaginationSchema.extend({
  classId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]).optional(),
});
