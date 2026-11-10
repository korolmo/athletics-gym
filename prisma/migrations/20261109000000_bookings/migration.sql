-- Этап 1 (ADR 0017): Записи к Тренеру; двойную Запись запрещает уникальный индекс (activeTrainerId, startAt).

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `trainerId` VARCHAR(191) NULL,
    `hallId` VARCHAR(191) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `activeTrainerId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelledBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Booking_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Booking_clientId_status_startAt_idx`(`clientId`, `status`, `startAt`),
    INDEX `Booking_trainerId_startAt_idx`(`trainerId`, `startAt`),
    INDEX `Booking_startAt_idx`(`startAt`),
    UNIQUE INDEX `Booking_activeTrainerId_startAt_key`(`activeTrainerId`, `startAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `Trainer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

