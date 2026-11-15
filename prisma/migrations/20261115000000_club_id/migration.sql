-- Этап П2, PR 2 (ADR 0020, 0022): clubId во всех 19 таблицах Клуба — expand без простоя.
-- Всё, что есть, — Клуба «club» (значение по умолчанию): старый код вставляет строки без clubId и попадает в него же,
-- поэтому прежний релиз работает с этой схемой (шаг CI «прежний код на новой схеме»). Уникальность — внутри Клуба:
-- новые составные индексы создаются ДО удаления прежних, чтобы во время выкатки уникальность не пропадала.
-- У Зала — вид (general / women): код будет опираться на него, а не на id. У Клуба — свой чат Telegram (решение 15).

-- AlterTable
ALTER TABLE `Hall` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club',
    ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE `Tariff` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `Trainer` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `Owner` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AboutCard: ключ становится (clubId, position). TiDB (Лаборатория) не умеет менять кластерный первичный ключ
-- (ошибка 8200 «Unsupported drop primary key»), поэтому таблицу пересобираем — одинаково на MariaDB и TiDB.
CREATE TABLE `AboutCard_p2` (
    `position` INTEGER NOT NULL,
    `kickerRu` VARCHAR(191) NOT NULL,
    `kickerKk` VARCHAR(191) NULL,
    `titleRu` VARCHAR(191) NOT NULL,
    `titleKk` VARCHAR(191) NULL,
    `textRu` TEXT NOT NULL,
    `textKk` TEXT NULL,
    `clubId` VARCHAR(191) NOT NULL DEFAULT 'club',

    PRIMARY KEY (`clubId`, `position`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `AboutCard_p2` (`position`, `kickerRu`, `kickerKk`, `titleRu`, `titleKk`, `textRu`, `textKk`)
    SELECT `position`, `kickerRu`, `kickerKk`, `titleRu`, `titleKk`, `textRu`, `textKk` FROM `AboutCard`;

DROP TABLE `AboutCard`;

RENAME TABLE `AboutCard_p2` TO `AboutCard`;

-- AlterTable
ALTER TABLE `GalleryPhoto` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `Review` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `ReviewSubmission` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `ContactClick` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `Direction` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `Client` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `ClientLoginCode` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `TrainerSchedule` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `TrainerWorkHours` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `TrainerTimeOff` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `OutboxEvent` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- AlterTable
ALTER TABLE `Club` ADD COLUMN `telegramChatId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `DemoState` ADD COLUMN `clubId` VARCHAR(191) NOT NULL DEFAULT 'club';

-- CreateIndex
CREATE INDEX `Hall_clubId_idx` ON `Hall`(`clubId`);

-- CreateIndex
CREATE INDEX `Tariff_clubId_idx` ON `Tariff`(`clubId`);

-- CreateIndex
CREATE INDEX `Trainer_clubId_idx` ON `Trainer`(`clubId`);

-- CreateIndex
CREATE UNIQUE INDEX `Owner_clubId_login_key` ON `Owner`(`clubId`, `login`);

-- CreateIndex
CREATE UNIQUE INDEX `SiteSettings_clubId_key` ON `SiteSettings`(`clubId`);

-- CreateIndex
CREATE UNIQUE INDEX `GalleryPhoto_clubId_path_key` ON `GalleryPhoto`(`clubId`, `path`);

-- CreateIndex
CREATE INDEX `Review_clubId_idx` ON `Review`(`clubId`);

-- CreateIndex
CREATE INDEX `ReviewSubmission_clubId_idx` ON `ReviewSubmission`(`clubId`);

-- CreateIndex
CREATE INDEX `ContactClick_clubId_idx` ON `ContactClick`(`clubId`);

-- CreateIndex
CREATE INDEX `Direction_clubId_idx` ON `Direction`(`clubId`);

-- CreateIndex
CREATE UNIQUE INDEX `Client_clubId_phone_key` ON `Client`(`clubId`, `phone`);

-- CreateIndex
CREATE INDEX `ClientLoginCode_clubId_idx` ON `ClientLoginCode`(`clubId`);

-- CreateIndex
CREATE INDEX `TrainerSchedule_clubId_idx` ON `TrainerSchedule`(`clubId`);

-- CreateIndex
CREATE INDEX `TrainerWorkHours_clubId_idx` ON `TrainerWorkHours`(`clubId`);

-- CreateIndex
CREATE INDEX `TrainerTimeOff_clubId_idx` ON `TrainerTimeOff`(`clubId`);

-- CreateIndex
CREATE UNIQUE INDEX `Booking_clubId_idempotencyKey_key` ON `Booking`(`clubId`, `idempotencyKey`);

-- CreateIndex
CREATE INDEX `OutboxEvent_clubId_idx` ON `OutboxEvent`(`clubId`);

-- CreateIndex
CREATE UNIQUE INDEX `DemoState_clubId_key` ON `DemoState`(`clubId`);

-- AddForeignKey
ALTER TABLE `Hall` ADD CONSTRAINT `Hall_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tariff` ADD CONSTRAINT `Tariff_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trainer` ADD CONSTRAINT `Trainer_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Owner` ADD CONSTRAINT `Owner_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSettings` ADD CONSTRAINT `SiteSettings_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AboutCard` ADD CONSTRAINT `AboutCard_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GalleryPhoto` ADD CONSTRAINT `GalleryPhoto_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewSubmission` ADD CONSTRAINT `ReviewSubmission_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactClick` ADD CONSTRAINT `ContactClick_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Direction` ADD CONSTRAINT `Direction_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientLoginCode` ADD CONSTRAINT `ClientLoginCode_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainerSchedule` ADD CONSTRAINT `TrainerSchedule_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainerWorkHours` ADD CONSTRAINT `TrainerWorkHours_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TrainerTimeOff` ADD CONSTRAINT `TrainerTimeOff_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutboxEvent` ADD CONSTRAINT `OutboxEvent_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DemoState` ADD CONSTRAINT `DemoState_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Вид Залов Athletic's Gym: Женский зал — women, остальные — general (по умолчанию)
UPDATE `Hall` SET `kind` = 'women' WHERE `id` = 'women';

-- Прежние уникальные индексы — последними: составные уже держат уникальность внутри Клуба
DROP INDEX `Owner_login_key` ON `Owner`;

DROP INDEX `GalleryPhoto_path_key` ON `GalleryPhoto`;

DROP INDEX `Client_phone_key` ON `Client`;

DROP INDEX `Booking_idempotencyKey_key` ON `Booking`;
