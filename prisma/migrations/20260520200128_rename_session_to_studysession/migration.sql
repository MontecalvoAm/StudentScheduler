/*
  Warnings:

  - You are about to drop the column `Session` on the `sched_classes` table. All the data in the column will be lost.
  - You are about to drop the column `Session` on the `sched_students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `sched_classes` DROP COLUMN `Session`,
    ADD COLUMN `StudySession` VARCHAR(10) NULL;

-- AlterTable
ALTER TABLE `sched_students` DROP COLUMN `Session`,
    ADD COLUMN `StudySession` VARCHAR(10) NULL;
