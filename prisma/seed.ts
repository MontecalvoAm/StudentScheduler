import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// ─── Module definitions ───────────────────────────────────────────────────────
const MODULES = [
  { ModuleKey: "users",       ModuleLabel: "Users Management",   SortOrder: 1 },
  { ModuleKey: "roles",       ModuleLabel: "Roles & Permissions", SortOrder: 2 },
  { ModuleKey: "departments", ModuleLabel: "Departments",        SortOrder: 3 },
  { ModuleKey: "courses",     ModuleLabel: "Courses",            SortOrder: 4 },
  { ModuleKey: "subjects",    ModuleLabel: "Subjects",           SortOrder: 5 },
  { ModuleKey: "rooms",       ModuleLabel: "Rooms",              SortOrder: 6 },
  { ModuleKey: "classes",     ModuleLabel: "Classes",            SortOrder: 7 },
  { ModuleKey: "schedules",   ModuleLabel: "Schedules",          SortOrder: 8 },
  { ModuleKey: "calendar",    ModuleLabel: "Calendar",           SortOrder: 9 },
  { ModuleKey: "audit-logs",  ModuleLabel: "Audit Logs",         SortOrder: 10 },
  { ModuleKey: "reports",     ModuleLabel: "Reports",            SortOrder: 11 },
  { ModuleKey: "attendance",  ModuleLabel: "Attendance Sessions", SortOrder: 12 },
];

// ─── Role permission matrix ───────────────────────────────────────────────────
// ALL = { CanCreate: true, CanRead: true, CanUpdate: true, CanDelete: true }
const ALL  = { CanCreate: true,  CanRead: true,  CanUpdate: true,  CanDelete: true  };
const READ = { CanCreate: false, CanRead: true,  CanUpdate: false, CanDelete: false };
const NONE = { CanCreate: false, CanRead: false, CanUpdate: false, CanDelete: false };
const RW   = { CanCreate: false, CanRead: true,  CanUpdate: true,  CanDelete: false };
const RWC  = { CanCreate: true,  CanRead: true,  CanUpdate: true,  CanDelete: false };

type PermFlags = { CanCreate: boolean; CanRead: boolean; CanUpdate: boolean; CanDelete: boolean };

// Default permission matrix per role (keyed by ModuleKey)
const ROLE_PERMISSIONS: Record<string, Record<string, PermFlags>> = {
  SUPER_ADMIN: {
    "users": ALL, "roles": ALL, "departments": ALL, "courses": ALL,
    "subjects": ALL, "rooms": ALL, "classes": ALL, "schedules": ALL,
    "calendar": ALL, "audit-logs": ALL, "reports": ALL, "attendance": ALL,
  },
  ADMIN: {
    "users": RWC, "roles": READ, "departments": ALL, "courses": ALL,
    "subjects": ALL, "rooms": ALL, "classes": ALL, "schedules": ALL,
    "calendar": READ, "audit-logs": READ, "reports": READ, "attendance": RW,
  },
  INSTRUCTOR: {
    "users": NONE, "roles": NONE, "departments": NONE, "courses": NONE,
    "subjects": READ, "rooms": READ, "classes": READ, "schedules": READ,
    "calendar": READ, "audit-logs": NONE, "reports": READ, "attendance": RWC,
  },
  STUDENT: {
    "users": NONE, "roles": NONE, "departments": NONE, "courses": READ,
    "subjects": READ, "rooms": NONE, "classes": READ, "schedules": READ,
    "calendar": READ, "audit-logs": NONE, "reports": READ, "attendance": NONE,
  },
};

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Roles ───────────────────────────────────────────────────────────────────
  const rolesData = [
    { RoleName: "SUPER_ADMIN", Description: "Full system access — immutable",           IsSystem: true },
    { RoleName: "ADMIN",       Description: "Administrative access",                    IsSystem: true },
    { RoleName: "INSTRUCTOR",  Description: "Manages classes and attendance",           IsSystem: true },
    { RoleName: "STUDENT",     Description: "Views schedules and marks attendance",     IsSystem: true },
  ];

  const roleIds: Record<string, number> = {};
  for (const role of rolesData) {
    const r = await prisma.m_Role.upsert({
      where:  { RoleName: role.RoleName },
      update: { Description: role.Description, IsSystem: role.IsSystem },
      create: role,
    });
    roleIds[role.RoleName] = r.RoleId;
    console.log(`  ✅ Role: ${role.RoleName} (ID: ${r.RoleId})`);
  }

  // ─── Default Super Admin User ─────────────────────────────────────────────
  const adminEmail    = "aljon.montecalvo08@gmail.com";
  const adminPassword = "@Aljon123";
  const adminHash     = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.m_User.upsert({
    where:  { Email: adminEmail },
    update: {},
    create: {
      Email:        adminEmail,
      PasswordHash: adminHash,
      FirstName:    "Aljon",
      LastName:     "Montecalvo",
      MiddleName:   "Bajenting",
      RoleId:       roleIds["SUPER_ADMIN"],
      IsActive:     true,
    },
  });
  console.log(`  ✅ Super Admin: ${adminEmail} (ID: ${admin.UserId})`);

  // ─── System Settings ──────────────────────────────────────────────────────
  const settings = [
    { SettingKey: "attendance.late_threshold_minutes", SettingValue: "15",  Description: "Minutes after schedule start to consider a student late" },
    { SettingKey: "attendance.low_percentage_threshold", SettingValue: "75", Description: "Attendance percentage below which a warning is sent" },
    { SettingKey: "attendance.qr_expiry_minutes",      SettingValue: "5",   Description: "QR code token expiry in minutes" },
    { SettingKey: "account.max_failed_logins",         SettingValue: "5",   Description: "Maximum failed login attempts before account lockout" },
    { SettingKey: "account.lockout_minutes",           SettingValue: "30",  Description: "Account lockout duration in minutes after max failed attempts" },
  ];

  for (const setting of settings) {
    await prisma.m_SystemSetting.upsert({
      where:  { SettingKey: setting.SettingKey },
      update: { SettingValue: setting.SettingValue },
      create: setting,
    });
    console.log(`  ✅ Setting: ${setting.SettingKey} = ${setting.SettingValue}`);
  }

  // ─── Sample School Year & Semester ────────────────────────────────────────
  const schoolYear = await prisma.m_SchoolYear.upsert({
    where:  { YearLabel: "2025-2026" },
    update: {},
    create: {
      YearLabel: "2025-2026",
      StartDate: new Date("2025-08-01"),
      EndDate:   new Date("2026-05-31"),
      IsActive:  true,
    },
  });
  console.log(`  ✅ School Year: 2025-2026 (ID: ${schoolYear.SchoolYearId})`);

  const semester1 = await prisma.m_Semester.upsert({
    where:  { SemesterId: 1 },
    update: {},
    create: {
      SchoolYearId: schoolYear.SchoolYearId,
      SemesterName: "First Semester",
      StartDate:    new Date("2025-08-12"),
      EndDate:      new Date("2025-12-15"),
      IsActive:     true,
    },
  });
  console.log(`  ✅ Semester: First Semester (ID: ${semester1.SemesterId})`);

  // ─── RBAC: Modules ────────────────────────────────────────────────────────
  console.log("\n  📦 Seeding modules...");
  const moduleIds: Record<string, number> = {};
  for (const mod of MODULES) {
    const m = await prisma.m_Module.upsert({
      where:  { ModuleKey: mod.ModuleKey },
      update: { ModuleLabel: mod.ModuleLabel, SortOrder: mod.SortOrder },
      create: mod,
    });
    moduleIds[mod.ModuleKey] = m.ModuleId;
    console.log(`    ✅ Module: ${mod.ModuleKey} (ID: ${m.ModuleId})`);
  }

  // ─── RBAC: Role Permissions ───────────────────────────────────────────────
  console.log("\n  🔐 Seeding role permissions...");
  for (const [roleName, modulePerms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds[roleName];
    if (!roleId) continue;

    for (const [moduleKey, flags] of Object.entries(modulePerms)) {
      const moduleId = moduleIds[moduleKey];
      if (!moduleId) continue;

      await prisma.m_RolePermission.upsert({
        where:  { RoleId_ModuleId: { RoleId: roleId, ModuleId: moduleId } },
        update: flags,
        create: { RoleId: roleId, ModuleId: moduleId, ...flags },
      });
    }
    console.log(`    ✅ Permissions set for role: ${roleName}`);
  }

  console.log("\n✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
