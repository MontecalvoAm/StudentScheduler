-- CreateTable
CREATE TABLE `sched_Roles` (
    `RoleId` INTEGER NOT NULL AUTO_INCREMENT,
    `RoleName` VARCHAR(50) NOT NULL,
    `Description` VARCHAR(255) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sched_Roles_RoleName_key`(`RoleName`),
    PRIMARY KEY (`RoleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Users` (
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
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sched_Users_Email_key`(`Email`),
    INDEX `sched_Users_RoleId_idx`(`RoleId`),
    INDEX `sched_Users_Email_idx`(`Email`),
    INDEX `sched_Users_DeletedAt_idx`(`DeletedAt`),
    PRIMARY KEY (`UserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_RefreshTokens` (
    `TokenId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `TokenHash` VARCHAR(512) NOT NULL,
    `ExpiresAt` DATETIME(3) NOT NULL,
    `IsRevoked` BOOLEAN NOT NULL DEFAULT false,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `IpAddress` VARCHAR(45) NULL,
    `UserAgent` VARCHAR(500) NULL,

    UNIQUE INDEX `sched_RefreshTokens_TokenHash_key`(`TokenHash`),
    INDEX `sched_RefreshTokens_UserId_idx`(`UserId`),
    INDEX `sched_RefreshTokens_ExpiresAt_idx`(`ExpiresAt`),
    PRIMARY KEY (`TokenId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Students` (
    `StudentId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `StudentNumber` VARCHAR(50) NOT NULL,
    `CourseId` INTEGER NULL,
    `YearLevel` INTEGER NULL,
    `Section` VARCHAR(20) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sched_Students_UserId_key`(`UserId`),
    UNIQUE INDEX `sched_Students_StudentNumber_key`(`StudentNumber`),
    INDEX `sched_Students_CourseId_idx`(`CourseId`),
    INDEX `sched_Students_StudentNumber_idx`(`StudentNumber`),
    PRIMARY KEY (`StudentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Instructors` (
    `InstructorId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NOT NULL,
    `EmployeeNumber` VARCHAR(50) NOT NULL,
    `Department` VARCHAR(100) NULL,
    `Specialization` VARCHAR(100) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sched_Instructors_UserId_key`(`UserId`),
    UNIQUE INDEX `sched_Instructors_EmployeeNumber_key`(`EmployeeNumber`),
    PRIMARY KEY (`InstructorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Courses` (
    `CourseId` INTEGER NOT NULL AUTO_INCREMENT,
    `CourseCode` VARCHAR(20) NOT NULL,
    `CourseName` VARCHAR(200) NOT NULL,
    `Description` TEXT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sched_Courses_CourseCode_key`(`CourseCode`),
    PRIMARY KEY (`CourseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Subjects` (
    `SubjectId` INTEGER NOT NULL AUTO_INCREMENT,
    `CourseId` INTEGER NULL,
    `SubjectCode` VARCHAR(20) NOT NULL,
    `SubjectName` VARCHAR(200) NOT NULL,
    `Units` INTEGER NOT NULL DEFAULT 3,
    `Description` TEXT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sched_Subjects_SubjectCode_key`(`SubjectCode`),
    INDEX `sched_Subjects_CourseId_idx`(`CourseId`),
    PRIMARY KEY (`SubjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Rooms` (
    `RoomId` INTEGER NOT NULL AUTO_INCREMENT,
    `RoomCode` VARCHAR(30) NOT NULL,
    `RoomName` VARCHAR(100) NOT NULL,
    `Building` VARCHAR(100) NULL,
    `Capacity` INTEGER NOT NULL DEFAULT 40,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sched_Rooms_RoomCode_key`(`RoomCode`),
    PRIMARY KEY (`RoomId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_SchoolYears` (
    `SchoolYearId` INTEGER NOT NULL AUTO_INCREMENT,
    `YearLabel` VARCHAR(20) NOT NULL,
    `StartDate` DATE NOT NULL,
    `EndDate` DATE NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT false,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sched_SchoolYears_YearLabel_key`(`YearLabel`),
    PRIMARY KEY (`SchoolYearId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Semesters` (
    `SemesterId` INTEGER NOT NULL AUTO_INCREMENT,
    `SchoolYearId` INTEGER NOT NULL,
    `SemesterName` VARCHAR(50) NOT NULL,
    `StartDate` DATE NOT NULL,
    `EndDate` DATE NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT false,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `sched_Semesters_SchoolYearId_idx`(`SchoolYearId`),
    PRIMARY KEY (`SemesterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Classes` (
    `ClassId` INTEGER NOT NULL AUTO_INCREMENT,
    `SubjectId` INTEGER NOT NULL,
    `SemesterId` INTEGER NOT NULL,
    `SectionCode` VARCHAR(30) NOT NULL,
    `MaxStudents` INTEGER NOT NULL DEFAULT 40,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,
    `DeletedAt` DATETIME(3) NULL,

    INDEX `sched_Classes_SemesterId_idx`(`SemesterId`),
    INDEX `sched_Classes_SubjectId_idx`(`SubjectId`),
    UNIQUE INDEX `sched_Classes_SubjectId_SectionCode_SemesterId_key`(`SubjectId`, `SectionCode`, `SemesterId`),
    PRIMARY KEY (`ClassId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Schedules` (
    `ScheduleId` INTEGER NOT NULL AUTO_INCREMENT,
    `ClassId` INTEGER NOT NULL,
    `RoomId` INTEGER NOT NULL,
    `DayOfWeek` INTEGER NOT NULL,
    `StartTime` VARCHAR(5) NOT NULL,
    `EndTime` VARCHAR(5) NOT NULL,
    `EffectiveFrom` DATE NOT NULL,
    `EffectiveTo` DATE NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `sched_Schedules_ClassId_DayOfWeek_idx`(`ClassId`, `DayOfWeek`),
    INDEX `sched_Schedules_RoomId_DayOfWeek_idx`(`RoomId`, `DayOfWeek`),
    PRIMARY KEY (`ScheduleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_Enrollments` (
    `EnrollmentId` INTEGER NOT NULL AUTO_INCREMENT,
    `StudentId` INTEGER NOT NULL,
    `ClassId` INTEGER NOT NULL,
    `EnrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `DroppedAt` DATETIME(3) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    INDEX `sched_Enrollments_ClassId_idx`(`ClassId`),
    INDEX `sched_Enrollments_StudentId_idx`(`StudentId`),
    UNIQUE INDEX `sched_Enrollments_StudentId_ClassId_key`(`StudentId`, `ClassId`),
    PRIMARY KEY (`EnrollmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_ClassAssignments` (
    `AssignmentId` INTEGER NOT NULL AUTO_INCREMENT,
    `InstructorId` INTEGER NOT NULL,
    `ClassId` INTEGER NOT NULL,
    `AssignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `RemovedAt` DATETIME(3) NULL,
    `IsPrimary` BOOLEAN NOT NULL DEFAULT true,

    INDEX `sched_ClassAssignments_ClassId_idx`(`ClassId`),
    UNIQUE INDEX `sched_ClassAssignments_InstructorId_ClassId_key`(`InstructorId`, `ClassId`),
    PRIMARY KEY (`AssignmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_AttendanceSessions` (
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
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sched_AttendanceSessions_QrCodeToken_key`(`QrCodeToken`),
    INDEX `sched_AttendanceSessions_ScheduleId_SessionDate_idx`(`ScheduleId`, `SessionDate`),
    INDEX `sched_AttendanceSessions_Status_idx`(`Status`),
    PRIMARY KEY (`SessionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_AttendanceRecords` (
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
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `sched_AttendanceRecords_StudentId_idx`(`StudentId`),
    INDEX `sched_AttendanceRecords_SessionId_idx`(`SessionId`),
    UNIQUE INDEX `sched_AttendanceRecords_SessionId_StudentId_key`(`SessionId`, `StudentId`),
    PRIMARY KEY (`AttendanceRecordId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_AuditLogs` (
    `AuditLogId` INTEGER NOT NULL AUTO_INCREMENT,
    `UserId` INTEGER NULL,
    `Action` VARCHAR(100) NOT NULL,
    `EntityType` VARCHAR(100) NOT NULL,
    `EntityId` VARCHAR(50) NULL,
    `OldValues` JSON NULL,
    `NewValues` JSON NULL,
    `IpAddress` VARCHAR(45) NULL,
    `UserAgent` VARCHAR(500) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sched_AuditLogs_UserId_idx`(`UserId`),
    INDEX `sched_AuditLogs_EntityType_EntityId_idx`(`EntityType`, `EntityId`),
    INDEX `sched_AuditLogs_CreatedAt_idx`(`CreatedAt`),
    INDEX `sched_AuditLogs_Action_idx`(`Action`),
    PRIMARY KEY (`AuditLogId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sched_SystemSettings` (
    `SettingId` INTEGER NOT NULL AUTO_INCREMENT,
    `SettingKey` VARCHAR(100) NOT NULL,
    `SettingValue` TEXT NOT NULL,
    `Description` VARCHAR(255) NULL,
    `UpdatedAt` DATETIME(3) NOT NULL,
    `UpdatedByUserId` INTEGER NULL,

    UNIQUE INDEX `sched_SystemSettings_SettingKey_key`(`SettingKey`),
    PRIMARY KEY (`SettingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sched_Users` ADD CONSTRAINT `sched_Users_RoleId_fkey` FOREIGN KEY (`RoleId`) REFERENCES `sched_Roles`(`RoleId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_RefreshTokens` ADD CONSTRAINT `sched_RefreshTokens_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `sched_Users`(`UserId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Students` ADD CONSTRAINT `sched_Students_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `sched_Users`(`UserId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Students` ADD CONSTRAINT `sched_Students_CourseId_fkey` FOREIGN KEY (`CourseId`) REFERENCES `sched_Courses`(`CourseId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Instructors` ADD CONSTRAINT `sched_Instructors_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `sched_Users`(`UserId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Subjects` ADD CONSTRAINT `sched_Subjects_CourseId_fkey` FOREIGN KEY (`CourseId`) REFERENCES `sched_Courses`(`CourseId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Semesters` ADD CONSTRAINT `sched_Semesters_SchoolYearId_fkey` FOREIGN KEY (`SchoolYearId`) REFERENCES `sched_SchoolYears`(`SchoolYearId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Classes` ADD CONSTRAINT `sched_Classes_SubjectId_fkey` FOREIGN KEY (`SubjectId`) REFERENCES `sched_Subjects`(`SubjectId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Classes` ADD CONSTRAINT `sched_Classes_SemesterId_fkey` FOREIGN KEY (`SemesterId`) REFERENCES `sched_Semesters`(`SemesterId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Schedules` ADD CONSTRAINT `sched_Schedules_ClassId_fkey` FOREIGN KEY (`ClassId`) REFERENCES `sched_Classes`(`ClassId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Schedules` ADD CONSTRAINT `sched_Schedules_RoomId_fkey` FOREIGN KEY (`RoomId`) REFERENCES `sched_Rooms`(`RoomId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Enrollments` ADD CONSTRAINT `sched_Enrollments_StudentId_fkey` FOREIGN KEY (`StudentId`) REFERENCES `sched_Students`(`StudentId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_Enrollments` ADD CONSTRAINT `sched_Enrollments_ClassId_fkey` FOREIGN KEY (`ClassId`) REFERENCES `sched_Classes`(`ClassId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_ClassAssignments` ADD CONSTRAINT `sched_ClassAssignments_InstructorId_fkey` FOREIGN KEY (`InstructorId`) REFERENCES `sched_Instructors`(`InstructorId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_ClassAssignments` ADD CONSTRAINT `sched_ClassAssignments_ClassId_fkey` FOREIGN KEY (`ClassId`) REFERENCES `sched_Classes`(`ClassId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_AttendanceSessions` ADD CONSTRAINT `sched_AttendanceSessions_ScheduleId_fkey` FOREIGN KEY (`ScheduleId`) REFERENCES `sched_Schedules`(`ScheduleId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_AttendanceRecords` ADD CONSTRAINT `sched_AttendanceRecords_SessionId_fkey` FOREIGN KEY (`SessionId`) REFERENCES `sched_AttendanceSessions`(`SessionId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_AttendanceRecords` ADD CONSTRAINT `sched_AttendanceRecords_StudentId_fkey` FOREIGN KEY (`StudentId`) REFERENCES `sched_Students`(`StudentId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sched_AuditLogs` ADD CONSTRAINT `sched_AuditLogs_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `sched_Users`(`UserId`) ON DELETE SET NULL ON UPDATE CASCADE;
