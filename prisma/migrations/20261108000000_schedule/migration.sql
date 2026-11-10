-- Этап 1 (ADR 0017): часы работы, исключения и длительность тренировки Тренера.

-- CreateTable
CREATE TABLE `TrainerSchedule` (
    `trainerId` VARCHAR(191) NOT NULL,
    `sessionMinutes` INTEGER NOT NULL DEFAULT 60,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`trainerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainerWorkHours` (
    `id` VARCHAR(191) NOT NULL,
    `trainerId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `startMin` INTEGER NOT NULL,
    `endMin` INTEGER NOT NULL,

    INDEX `TrainerWorkHours_trainerId_idx`(`trainerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TrainerTimeOff` (
    `id` VARCHAR(191) NOT NULL,
    `trainerId` VARCHAR(191) NOT NULL,
    `fromDay` VARCHAR(191) NOT NULL,
    `toDay` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TrainerTimeOff_trainerId_toDay_idx`(`trainerId`, `toDay`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrainerSchedule` ADD CONSTRAINT `TrainerSchedule_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `Trainer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainerWorkHours` ADD CONSTRAINT `TrainerWorkHours_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `Trainer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainerTimeOff` ADD CONSTRAINT `TrainerTimeOff_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `Trainer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

