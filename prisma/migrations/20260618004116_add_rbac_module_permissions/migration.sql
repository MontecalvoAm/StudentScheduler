/*
  Warnings:

  - You are about to drop the `sched_attendancerecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_attendancesessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_auditlogs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_classassignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_classes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_enrollments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_instructors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_refreshtokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_rooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_schoolyears` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_semesters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_students` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_subjects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_systemsettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sched_users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `sched_attendancerecords` DROP FOREIGN KEY `sched_AttendanceRecords_SessionId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_attendancerecords` DROP FOREIGN KEY `sched_AttendanceRecords_StudentId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_attendancesessions` DROP FOREIGN KEY `sched_AttendanceSessions_ScheduleId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_auditlogs` DROP FOREIGN KEY `sched_AuditLogs_UserId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_classassignments` DROP FOREIGN KEY `sched_ClassAssignments_ClassId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_classassignments` DROP FOREIGN KEY `sched_ClassAssignments_InstructorId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_classes` DROP FOREIGN KEY `sched_Classes_SemesterId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_classes` DROP FOREIGN KEY `sched_Classes_SubjectId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_enrollments` DROP FOREIGN KEY `sched_Enrollments_ClassId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_enrollments` DROP FOREIGN KEY `sched_Enrollments_StudentId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_instructors` DROP FOREIGN KEY `sched_Instructors_UserId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_refreshtokens` DROP FOREIGN KEY `sched_RefreshTokens_UserId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_schedules` DROP FOREIGN KEY `sched_Schedules_ClassId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_schedules` DROP FOREIGN KEY `sched_Schedules_RoomId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_semesters` DROP FOREIGN KEY `sched_Semesters_SchoolYearId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_students` DROP FOREIGN KEY `sched_Students_CourseId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_students` DROP FOREIGN KEY `sched_Students_UserId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_subjects` DROP FOREIGN KEY `sched_Subjects_CourseId_fkey`;

-- DropForeignKey
ALTER TABLE `sched_users` DROP FOREIGN KEY `sched_Users_RoleId_fkey`;

-- DropTable
DROP TABLE `sched_attendancerecords`;

-- DropTable
DROP TABLE `sched_attendancesessions`;

-- DropTable
DROP TABLE `sched_auditlogs`;

-- DropTable
DROP TABLE `sched_classassignments`;

-- DropTable
DROP TABLE `sched_classes`;

-- DropTable
DROP TABLE `sched_courses`;

-- DropTable
DROP TABLE `sched_enrollments`;

-- DropTable
DROP TABLE `sched_instructors`;

-- DropTable
DROP TABLE `sched_refreshtokens`;

-- DropTable
DROP TABLE `sched_roles`;

-- DropTable
DROP TABLE `sched_rooms`;

-- DropTable
DROP TABLE `sched_schedules`;

-- DropTable
DROP TABLE `sched_schoolyears`;

-- DropTable
DROP TABLE `sched_semesters`;

-- DropTable
DROP TABLE `sched_students`;

-- DropTable
DROP TABLE `sched_subjects`;

-- DropTable
DROP TABLE `sched_systemsettings`;

-- DropTable
DROP TABLE `sched_users`;

-- CreateTable
CREATE TABLE `M_Role` (
    `RoleId` INTEGER NOT NULL AUTO_INCREMENT,
    `RoleToken` VARCHAR(36) NOT NULL,
    `RoleName` VARCHAR(50) NOT NULL,
    `Description` VARCHAR(255) NULL,
    `IsSystem` BOOLEAN NOT NULL DEFAULT false,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_Role_RoleToken_key`(`RoleToken`),
    UNIQUE INDEX `M_Role_RoleName_key`(`RoleName`),
    PRIMARY KEY (`RoleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_User` (
    `UserId` INTEGER NOT NULL AUTO_INCREMENT,
    `RoleId` INTEGER NOT NULL,
    `Email` VARCHAR(255) NOT NULL,
    `PasswordHash` VARCHAR(255) NOT NULL,
    `FirstName` VARCHAR(100) NOT NULL,
    `LastName` VARCHAR(100) NOT NULL,
    `MiddleName` VARCHAR(100) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `IsLocked` BOOLEAN NOT NULL DEFAULT false,
    `FailedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `LockedUntil` DATETIME(3) NULL,
    `LastLoginAt` DATETIME(3) NULL,
    `PasswordChangedAt` DATETIME(3) NULL,
    `MfaSecret` VARCHAR(255) NULL,
    `MfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_User_Email_key`(`Email`),
    INDEX `M_User_RoleId_idx`(`RoleId`),
    INDEX `M_User_Email_idx`(`Email`),
    INDEX `M_User_DeletedAt_idx`(`DeletedAt`),
    PRIMARY KEY (`UserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_RefreshToken` (
    `TokenId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `TokenHash` VARCHAR(512) NOT NULL,
    `ExpiresAt` DATETIME(3) NOT NULL,
    `IsRevoked` BOOLEAN NOT NULL DEFAULT false,
    `IpAddress` VARCHAR(45) NULL,
    `UserAgent` VARCHAR(500) NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `T_RefreshToken_TokenHash_key`(`TokenHash`),
    INDEX `T_RefreshToken_UserId_idx`(`UserId`),
    INDEX `T_RefreshToken_ExpiresAt_idx`(`ExpiresAt`),
    PRIMARY KEY (`TokenId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Student` (
    `StudentId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `StudentNumber` VARCHAR(50) NOT NULL,
    `CourseId` INTEGER NULL,
    `YearLevel` INTEGER NULL,
    `Section` VARCHAR(20) NULL,
    `StudySession` VARCHAR(10) NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_Student_UserId_key`(`UserId`),
    UNIQUE INDEX `M_Student_StudentNumber_key`(`StudentNumber`),
    INDEX `M_Student_CourseId_idx`(`CourseId`),
    INDEX `M_Student_StudentNumber_idx`(`StudentNumber`),
    PRIMARY KEY (`StudentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Instructor` (
    `InstructorId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `EmployeeNumber` VARCHAR(50) NOT NULL,
    `DepartmentId` INTEGER NULL,
    `Specialization` VARCHAR(100) NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_Instructor_UserId_key`(`UserId`),
    UNIQUE INDEX `M_Instructor_EmployeeNumber_key`(`EmployeeNumber`),
    INDEX `M_Instructor_DepartmentId_idx`(`DepartmentId`),
    PRIMARY KEY (`InstructorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Department` (
    `DepartmentId` INTEGER NOT NULL AUTO_INCREMENT,
    `DepartmentToken` VARCHAR(36) NOT NULL,
    `DepartmentCode` VARCHAR(20) NOT NULL,
    `DepartmentName` VARCHAR(200) NOT NULL,
    `Description` TEXT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_Department_DepartmentToken_key`(`DepartmentToken`),
    UNIQUE INDEX `M_Department_DepartmentCode_key`(`DepartmentCode`),
    PRIMARY KEY (`DepartmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Course` (
    `CourseId` INTEGER NOT NULL AUTO_INCREMENT,
    `CourseToken` VARCHAR(36) NOT NULL,
    `DepartmentId` INTEGER NULL,
    `CourseCode` VARCHAR(20) NOT NULL,
    `CourseName` VARCHAR(200) NOT NULL,
    `Description` TEXT NULL,
    `YearsDuration` INTEGER NOT NULL DEFAULT 4,
    `RequiredUnits` INTEGER NOT NULL DEFAULT 120,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_Course_CourseToken_key`(`CourseToken`),
    UNIQUE INDEX `M_Course_CourseCode_key`(`CourseCode`),
    INDEX `M_Course_DepartmentId_idx`(`DepartmentId`),
    PRIMARY KEY (`CourseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Subject` (
    `SubjectId` INTEGER NOT NULL AUTO_INCREMENT,
    `SubjectToken` VARCHAR(36) NOT NULL,
    `CourseId` INTEGER NULL,
    `SubjectCode` VARCHAR(20) NOT NULL,
    `SubjectName` VARCHAR(200) NOT NULL,
    `Units` INTEGER NOT NULL DEFAULT 3,
    `Description` TEXT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_Subject_SubjectToken_key`(`SubjectToken`),
    UNIQUE INDEX `M_Subject_SubjectCode_key`(`SubjectCode`),
    INDEX `M_Subject_CourseId_idx`(`CourseId`),
    PRIMARY KEY (`SubjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Room` (
    `RoomId` INTEGER NOT NULL AUTO_INCREMENT,
    `RoomCode` VARCHAR(30) NOT NULL,
    `RoomName` VARCHAR(100) NOT NULL,
    `Building` VARCHAR(100) NULL,
    `Capacity` INTEGER NOT NULL DEFAULT 40,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_Room_RoomCode_key`(`RoomCode`),
    PRIMARY KEY (`RoomId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_SchoolYear` (
    `SchoolYearId` INTEGER NOT NULL AUTO_INCREMENT,
    `YearLabel` VARCHAR(20) NOT NULL,
    `StartDate` DATE NOT NULL,
    `EndDate` DATE NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT false,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_SchoolYear_YearLabel_key`(`YearLabel`),
    PRIMARY KEY (`SchoolYearId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Semester` (
    `SemesterId` INTEGER NOT NULL AUTO_INCREMENT,
    `SchoolYearId` INTEGER NOT NULL,
    `SemesterName` VARCHAR(50) NOT NULL,
    `StartDate` DATE NOT NULL,
    `EndDate` DATE NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT false,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `M_Semester_SchoolYearId_idx`(`SchoolYearId`),
    PRIMARY KEY (`SemesterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MT_Class` (
    `ClassId` INTEGER NOT NULL AUTO_INCREMENT,
    `SubjectId` INTEGER NOT NULL,
    `SemesterId` INTEGER NOT NULL,
    `SectionCode` VARCHAR(30) NOT NULL,
    `StudySession` VARCHAR(10) NULL,
    `MaxStudents` INTEGER NOT NULL DEFAULT 40,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `MT_Class_SemesterId_idx`(`SemesterId`),
    INDEX `MT_Class_SubjectId_idx`(`SubjectId`),
    UNIQUE INDEX `MT_Class_SubjectId_SectionCode_SemesterId_key`(`SubjectId`, `SectionCode`, `SemesterId`),
    PRIMARY KEY (`ClassId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MT_Schedule` (
    `ScheduleId` INTEGER NOT NULL AUTO_INCREMENT,
    `ClassId` INTEGER NOT NULL,
    `RoomId` INTEGER NOT NULL,
    `DayOfWeek` INTEGER NOT NULL,
    `StartTime` VARCHAR(5) NOT NULL,
    `EndTime` VARCHAR(5) NOT NULL,
    `EffectiveFrom` DATE NOT NULL,
    `EffectiveTo` DATE NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `MT_Schedule_ClassId_DayOfWeek_idx`(`ClassId`, `DayOfWeek`),
    INDEX `MT_Schedule_RoomId_DayOfWeek_idx`(`RoomId`, `DayOfWeek`),
    PRIMARY KEY (`ScheduleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MT_Enrollment` (
    `EnrollmentId` INTEGER NOT NULL AUTO_INCREMENT,
    `StudentId` INTEGER NOT NULL,
    `ClassId` INTEGER NOT NULL,
    `EnrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `DroppedAt` DATETIME(3) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `MT_Enrollment_ClassId_idx`(`ClassId`),
    INDEX `MT_Enrollment_StudentId_idx`(`StudentId`),
    UNIQUE INDEX `MT_Enrollment_StudentId_ClassId_key`(`StudentId`, `ClassId`),
    PRIMARY KEY (`EnrollmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MT_ClassAssignment` (
    `AssignmentId` INTEGER NOT NULL AUTO_INCREMENT,
    `InstructorId` INTEGER NOT NULL,
    `ClassId` INTEGER NOT NULL,
    `AssignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `RemovedAt` DATETIME(3) NULL,
    `IsPrimary` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `MT_ClassAssignment_ClassId_idx`(`ClassId`),
    UNIQUE INDEX `MT_ClassAssignment_InstructorId_ClassId_key`(`InstructorId`, `ClassId`),
    PRIMARY KEY (`AssignmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_AttendanceSession` (
    `SessionId` INTEGER NOT NULL AUTO_INCREMENT,
    `ScheduleId` INTEGER NOT NULL,
    `SessionDate` DATE NOT NULL,
    `OpenedAt` DATETIME(3) NULL,
    `ClosedAt` DATETIME(3) NULL,
    `AutoCloseAt` DATETIME(3) NULL,
    `QrCodeToken` VARCHAR(512) NULL,
    `QrExpiresAt` DATETIME(3) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `Method` VARCHAR(20) NOT NULL DEFAULT 'BUTTON',
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `T_AttendanceSession_QrCodeToken_key`(`QrCodeToken`),
    INDEX `T_AttendanceSession_ScheduleId_SessionDate_idx`(`ScheduleId`, `SessionDate`),
    INDEX `T_AttendanceSession_Status_idx`(`Status`),
    PRIMARY KEY (`SessionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_AttendanceRecord` (
    `AttendanceRecordId` INTEGER NOT NULL AUTO_INCREMENT,
    `SessionId` INTEGER NOT NULL,
    `StudentId` INTEGER NOT NULL,
    `Status` VARCHAR(20) NOT NULL,
    `MarkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `MarkedByUserId` INTEGER NULL,
    `Remarks` TEXT NULL,
    `IsOverridden` BOOLEAN NOT NULL DEFAULT false,
    `OverriddenAt` DATETIME(3) NULL,
    `OverriddenByUserId` INTEGER NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `T_AttendanceRecord_StudentId_idx`(`StudentId`),
    INDEX `T_AttendanceRecord_SessionId_idx`(`SessionId`),
    UNIQUE INDEX `T_AttendanceRecord_SessionId_StudentId_key`(`SessionId`, `StudentId`),
    PRIMARY KEY (`AttendanceRecordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_AuditLog` (
    `AuditLogId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NULL,
    `Action` VARCHAR(100) NOT NULL,
    `EntityType` VARCHAR(100) NOT NULL,
    `EntityId` VARCHAR(50) NULL,
    `OldValues` JSON NULL,
    `NewValues` JSON NULL,
    `IpAddress` VARCHAR(45) NULL,
    `UserAgent` VARCHAR(500) NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `T_AuditLog_UserId_idx`(`UserId`),
    INDEX `T_AuditLog_EntityType_EntityId_idx`(`EntityType`, `EntityId`),
    INDEX `T_AuditLog_CreatedAt_idx`(`CreatedAt`),
    INDEX `T_AuditLog_Action_idx`(`Action`),
    PRIMARY KEY (`AuditLogId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_SystemSetting` (
    `SettingId` INTEGER NOT NULL AUTO_INCREMENT,
    `SettingKey` VARCHAR(100) NOT NULL,
    `SettingValue` TEXT NOT NULL,
    `Description` VARCHAR(255) NULL,
    `UpdatedByUserId` INTEGER NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_SystemSetting_SettingKey_key`(`SettingKey`),
    PRIMARY KEY (`SettingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_SubjectPrerequisite` (
    `PrerequisiteId` INTEGER NOT NULL AUTO_INCREMENT,
    `PrerequisiteToken` VARCHAR(36) NOT NULL,
    `SubjectId` INTEGER NOT NULL,
    `PrerequisiteSubjectId` INTEGER NOT NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_SubjectPrerequisite_PrerequisiteToken_key`(`PrerequisiteToken`),
    UNIQUE INDEX `M_SubjectPrerequisite_SubjectId_PrerequisiteSubjectId_key`(`SubjectId`, `PrerequisiteSubjectId`),
    PRIMARY KEY (`PrerequisiteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_CourseSubject` (
    `CourseSubjectId` INTEGER NOT NULL AUTO_INCREMENT,
    `CourseSubjectToken` VARCHAR(36) NOT NULL,
    `CourseId` INTEGER NOT NULL,
    `SubjectId` INTEGER NOT NULL,
    `YearLevel` INTEGER NOT NULL,
    `Semester` INTEGER NOT NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_CourseSubject_CourseSubjectToken_key`(`CourseSubjectToken`),
    UNIQUE INDEX `M_CourseSubject_CourseId_SubjectId_YearLevel_Semester_key`(`CourseId`, `SubjectId`, `YearLevel`, `Semester`),
    PRIMARY KEY (`CourseSubjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_StudentStudyPlan` (
    `StudyPlanId` INTEGER NOT NULL AUTO_INCREMENT,
    `StudyPlanToken` VARCHAR(36) NOT NULL,
    `StudentId` INTEGER NOT NULL,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `T_StudentStudyPlan_StudyPlanToken_key`(`StudyPlanToken`),
    UNIQUE INDEX `T_StudentStudyPlan_StudentId_key`(`StudentId`),
    PRIMARY KEY (`StudyPlanId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_StudentStudyPlanSubject` (
    `StudyPlanSubjectId` INTEGER NOT NULL AUTO_INCREMENT,
    `StudyPlanSubjectToken` VARCHAR(36) NOT NULL,
    `StudyPlanId` INTEGER NOT NULL,
    `SubjectId` INTEGER NOT NULL,
    `TargetYearLevel` INTEGER NOT NULL,
    `TargetSemester` INTEGER NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `T_StudentStudyPlanSubject_StudyPlanSubjectToken_key`(`StudyPlanSubjectToken`),
    UNIQUE INDEX `T_StudentStudyPlanSubject_StudyPlanId_SubjectId_key`(`StudyPlanId`, `SubjectId`),
    PRIMARY KEY (`StudyPlanSubjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Module` (
    `ModuleId` INTEGER NOT NULL AUTO_INCREMENT,
    `ModuleKey` VARCHAR(50) NOT NULL,
    `ModuleLabel` VARCHAR(100) NOT NULL,
    `SortOrder` INTEGER NOT NULL DEFAULT 0,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `M_Module_ModuleKey_key`(`ModuleKey`),
    PRIMARY KEY (`ModuleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_RolePermission` (
    `PermissionId` INTEGER NOT NULL AUTO_INCREMENT,
    `PermissionToken` VARCHAR(36) NOT NULL,
    `RoleId` INTEGER NOT NULL,
    `ModuleId` INTEGER NOT NULL,
    `CanCreate` BOOLEAN NOT NULL DEFAULT false,
    `CanRead` BOOLEAN NOT NULL DEFAULT false,
    `CanUpdate` BOOLEAN NOT NULL DEFAULT false,
    `CanDelete` BOOLEAN NOT NULL DEFAULT false,
    `CreatedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedBy` INTEGER NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedBy` INTEGER NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `M_RolePermission_PermissionToken_key`(`PermissionToken`),
    INDEX `M_RolePermission_RoleId_idx`(`RoleId`),
    UNIQUE INDEX `M_RolePermission_RoleId_ModuleId_key`(`RoleId`, `ModuleId`),
    PRIMARY KEY (`PermissionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `M_User` ADD CONSTRAINT `M_User_RoleId_fkey` FOREIGN KEY (`RoleId`) REFERENCES `M_Role`(`RoleId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_RefreshToken` ADD CONSTRAINT `T_RefreshToken_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `M_User`(`UserId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Student` ADD CONSTRAINT `M_Student_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `M_User`(`UserId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Student` ADD CONSTRAINT `M_Student_CourseId_fkey` FOREIGN KEY (`CourseId`) REFERENCES `M_Course`(`CourseId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Instructor` ADD CONSTRAINT `M_Instructor_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `M_User`(`UserId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Instructor` ADD CONSTRAINT `M_Instructor_DepartmentId_fkey` FOREIGN KEY (`DepartmentId`) REFERENCES `M_Department`(`DepartmentId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Course` ADD CONSTRAINT `M_Course_DepartmentId_fkey` FOREIGN KEY (`DepartmentId`) REFERENCES `M_Department`(`DepartmentId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Subject` ADD CONSTRAINT `M_Subject_CourseId_fkey` FOREIGN KEY (`CourseId`) REFERENCES `M_Course`(`CourseId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Semester` ADD CONSTRAINT `M_Semester_SchoolYearId_fkey` FOREIGN KEY (`SchoolYearId`) REFERENCES `M_SchoolYear`(`SchoolYearId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_Class` ADD CONSTRAINT `MT_Class_SubjectId_fkey` FOREIGN KEY (`SubjectId`) REFERENCES `M_Subject`(`SubjectId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_Class` ADD CONSTRAINT `MT_Class_SemesterId_fkey` FOREIGN KEY (`SemesterId`) REFERENCES `M_Semester`(`SemesterId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_Schedule` ADD CONSTRAINT `MT_Schedule_ClassId_fkey` FOREIGN KEY (`ClassId`) REFERENCES `MT_Class`(`ClassId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_Schedule` ADD CONSTRAINT `MT_Schedule_RoomId_fkey` FOREIGN KEY (`RoomId`) REFERENCES `M_Room`(`RoomId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_Enrollment` ADD CONSTRAINT `MT_Enrollment_StudentId_fkey` FOREIGN KEY (`StudentId`) REFERENCES `M_Student`(`StudentId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_Enrollment` ADD CONSTRAINT `MT_Enrollment_ClassId_fkey` FOREIGN KEY (`ClassId`) REFERENCES `MT_Class`(`ClassId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_ClassAssignment` ADD CONSTRAINT `MT_ClassAssignment_InstructorId_fkey` FOREIGN KEY (`InstructorId`) REFERENCES `M_Instructor`(`InstructorId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_ClassAssignment` ADD CONSTRAINT `MT_ClassAssignment_ClassId_fkey` FOREIGN KEY (`ClassId`) REFERENCES `MT_Class`(`ClassId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_AttendanceSession` ADD CONSTRAINT `T_AttendanceSession_ScheduleId_fkey` FOREIGN KEY (`ScheduleId`) REFERENCES `MT_Schedule`(`ScheduleId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_AttendanceRecord` ADD CONSTRAINT `T_AttendanceRecord_SessionId_fkey` FOREIGN KEY (`SessionId`) REFERENCES `T_AttendanceSession`(`SessionId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_AttendanceRecord` ADD CONSTRAINT `T_AttendanceRecord_StudentId_fkey` FOREIGN KEY (`StudentId`) REFERENCES `M_Student`(`StudentId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_AuditLog` ADD CONSTRAINT `T_AuditLog_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `M_User`(`UserId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_SubjectPrerequisite` ADD CONSTRAINT `M_SubjectPrerequisite_SubjectId_fkey` FOREIGN KEY (`SubjectId`) REFERENCES `M_Subject`(`SubjectId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_SubjectPrerequisite` ADD CONSTRAINT `M_SubjectPrerequisite_PrerequisiteSubjectId_fkey` FOREIGN KEY (`PrerequisiteSubjectId`) REFERENCES `M_Subject`(`SubjectId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_CourseSubject` ADD CONSTRAINT `M_CourseSubject_CourseId_fkey` FOREIGN KEY (`CourseId`) REFERENCES `M_Course`(`CourseId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_CourseSubject` ADD CONSTRAINT `M_CourseSubject_SubjectId_fkey` FOREIGN KEY (`SubjectId`) REFERENCES `M_Subject`(`SubjectId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_StudentStudyPlan` ADD CONSTRAINT `T_StudentStudyPlan_StudentId_fkey` FOREIGN KEY (`StudentId`) REFERENCES `M_Student`(`StudentId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_StudentStudyPlanSubject` ADD CONSTRAINT `T_StudentStudyPlanSubject_StudyPlanId_fkey` FOREIGN KEY (`StudyPlanId`) REFERENCES `T_StudentStudyPlan`(`StudyPlanId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_StudentStudyPlanSubject` ADD CONSTRAINT `T_StudentStudyPlanSubject_SubjectId_fkey` FOREIGN KEY (`SubjectId`) REFERENCES `M_Subject`(`SubjectId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_RolePermission` ADD CONSTRAINT `M_RolePermission_RoleId_fkey` FOREIGN KEY (`RoleId`) REFERENCES `M_Role`(`RoleId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_RolePermission` ADD CONSTRAINT `M_RolePermission_ModuleId_fkey` FOREIGN KEY (`ModuleId`) REFERENCES `M_Module`(`ModuleId`) ON DELETE RESTRICT ON UPDATE CASCADE;
