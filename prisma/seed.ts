import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Roles ──────────────────────────────────────────────────────────────────
  const rolesData = [
    { RoleName: "SUPER_ADMIN", Description: "Full system access" },
    { RoleName: "INSTRUCTOR", Description: "Manages classes and attendance" },
    { RoleName: "STUDENT", Description: "Views schedules and marks attendance" },
  ];

  const roles: Record<string, number> = {};
  for (const role of rolesData) {
    const r = await prisma.m_Role.upsert({
      where: { RoleName: role.RoleName },
      update: { Description: role.Description },
      create: role,
    });
    roles[role.RoleName] = r.RoleId;
    console.log(`  ✅ Role: ${role.RoleName} (ID: ${r.RoleId})`);
  }

  // ─── Default Super Admin User ────────────────────────────────────────────────
  const adminEmail    = "aljon.montecalvo08@gmail.com";
  const adminPassword = "@Aljon123";
  const adminHash     = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.m_User.upsert({
    where: { Email: adminEmail },
    update: {},
    create: {
      Email:      adminEmail,
      PasswordHash: adminHash,
      FirstName:  "Aljon",
      LastName:   "Montecalvo",
      MiddleName: "Bajenting",
      RoleId:     roles["SUPER_ADMIN"],
      IsActive:   true,
    },
  });
  console.log(`  ✅ Super Admin: ${adminEmail} (ID: ${admin.UserId})`);

  // ─── System Settings ─────────────────────────────────────────────────────────
  const settings = [
    {
      SettingKey:   "attendance.late_threshold_minutes",
      SettingValue: "15",
      Description:  "Minutes after schedule start to consider a student late",
    },
    {
      SettingKey:   "attendance.low_percentage_threshold",
      SettingValue: "75",
      Description:  "Attendance percentage below which a warning is sent",
    },
    {
      SettingKey:   "attendance.qr_expiry_minutes",
      SettingValue: "5",
      Description:  "QR code token expiry in minutes",
    },
    {
      SettingKey:   "account.max_failed_logins",
      SettingValue: "5",
      Description:  "Maximum failed login attempts before account lockout",
    },
    {
      SettingKey:   "account.lockout_minutes",
      SettingValue: "30",
      Description:  "Account lockout duration in minutes after max failed attempts",
    },
  ];

  for (const setting of settings) {
    await prisma.m_SystemSetting.upsert({
      where:  { SettingKey: setting.SettingKey },
      update: { SettingValue: setting.SettingValue },
      create: setting,
    });
    console.log(`  ✅ Setting: ${setting.SettingKey} = ${setting.SettingValue}`);
  }

  // ─── Sample School Year & Semester ──────────────────────────────────────────
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
