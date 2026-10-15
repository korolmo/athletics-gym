-- Базовая миграция под MariaDB 10.4 (этап 8, ADR 0004). Схема та же, что после
-- PostgreSQL-миграций из prisma/archive/postgres-migrations: данные переносятся дампом (scripts/transfer).

-- CreateTable
CREATE TABLE `Hall` (
    `id` VARCHAR(191) NOT NULL,
    `nameRu` VARCHAR(191) NOT NULL,
    `nameKk` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `pricePoster` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tariff` (
    `id` VARCHAR(191) NOT NULL,
    `hallId` VARCHAR(191) NOT NULL,
    `trainerId` VARCHAR(191) NULL,
    `category` ENUM('SINGLE', 'VISITS', 'UNLIMITED', 'PERSONAL') NOT NULL,
    `titleRu` VARCHAR(191) NULL,
    `titleKk` VARCHAR(191) NULL,
    `visitsPerMonth` INTEGER NULL,
    `durationMonths` INTEGER NULL,
    `access` ENUM('DAY', 'FULL') NOT NULL DEFAULT 'FULL',
    `audience` ENUM('ALL', 'STUDENTS', 'WOMEN', 'MEN') NOT NULL DEFAULT 'ALL',
    `price` INTEGER NOT NULL,
    `priceTo` INTEGER NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tariff_hallId_category_idx`(`hallId`, `category`),
    INDEX `Tariff_trainerId_idx`(`trainerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trainer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `hallId` VARCHAR(191) NOT NULL,
    `photo` VARCHAR(191) NULL,
    `uploadedPhoto` VARCHAR(191) NULL,
    `descriptionRu` TEXT NULL,
    `descriptionKk` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    INDEX `Trainer_hallId_idx`(`hallId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoginAttempt_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Owner` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'owner',
    `login` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `sessionVersion` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Owner_login_key`(`login`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'site',
    `heroTitleRu` VARCHAR(191) NOT NULL,
    `heroTitleKk` VARCHAR(191) NULL,
    `heroSubtitleRu` TEXT NOT NULL,
    `heroSubtitleKk` TEXT NULL,
    `heroPhoto` VARCHAR(191) NULL,
    `womenTextRu` TEXT NOT NULL,
    `womenTextKk` TEXT NULL,
    `womenInstagram` VARCHAR(191) NOT NULL,
    `womenPhoto` VARCHAR(191) NULL,
    `addressRu` TEXT NOT NULL,
    `addressKk` TEXT NULL,
    `hoursRu` VARCHAR(191) NOT NULL,
    `hoursKk` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NOT NULL,
    `instagram` VARCHAR(191) NOT NULL,
    `ratingTenths` INTEGER NOT NULL,
    `ratingCount` INTEGER NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `legalBin` VARCHAR(191) NULL,
    `legalAddress` TEXT NULL,
    `privacyEmail` VARCHAR(191) NULL,
    `dataLocationRu` TEXT NULL,
    `dataLocationKk` TEXT NULL,
    `marqueeRu` TEXT NOT NULL,
    `marqueeKk` TEXT NOT NULL,
    `showMarquee` BOOLEAN NOT NULL DEFAULT true,
    `showAbout` BOOLEAN NOT NULL DEFAULT true,
    `showDirections` BOOLEAN NOT NULL DEFAULT true,
    `showWomen` BOOLEAN NOT NULL DEFAULT true,
    `showPrices` BOOLEAN NOT NULL DEFAULT true,
    `showGallery` BOOLEAN NOT NULL DEFAULT true,
    `showTrainers` BOOLEAN NOT NULL DEFAULT true,
    `showContacts` BOOLEAN NOT NULL DEFAULT true,
    `showReviews` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AboutCard` (
    `position` INTEGER NOT NULL,
    `kickerRu` VARCHAR(191) NOT NULL,
    `kickerKk` VARCHAR(191) NULL,
    `titleRu` VARCHAR(191) NOT NULL,
    `titleKk` VARCHAR(191) NULL,
    `textRu` TEXT NOT NULL,
    `textKk` TEXT NULL,

    PRIMARY KEY (`position`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GalleryPhoto` (
    `id` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `captionRu` VARCHAR(191) NULL,
    `captionKk` VARCHAR(191) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GalleryPhoto_path_key`(`path`),
    INDEX `GalleryPhoto_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `rating` INTEGER NOT NULL,
    `hallId` VARCHAR(191) NULL,
    `source` ENUM('SITE', 'TWOGIS', 'INSTAGRAM', 'GOOGLE', 'OTHER') NOT NULL,
    `sourceUrl` TEXT NULL,
    `reviewedAt` DATETIME(3) NOT NULL,
    `status` ENUM('NEW', 'PUBLISHED', 'HIDDEN') NOT NULL DEFAULT 'NEW',
    `fromVisitor` BOOLEAN NOT NULL DEFAULT false,
    `consentAt` DATETIME(3) NULL,
    `consentPolicyDate` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Review_status_reviewedAt_idx`(`status`, `reviewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReviewSubmission_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactClick` (
    `id` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactClick_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Direction` (
    `id` VARCHAR(191) NOT NULL,
    `titleRu` VARCHAR(191) NOT NULL,
    `titleKk` VARCHAR(191) NULL,
    `descriptionRu` TEXT NULL,
    `descriptionKk` TEXT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT 'exercise',
    `photo` VARCHAR(191) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Direction_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tariff` ADD CONSTRAINT `Tariff_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `Hall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tariff` ADD CONSTRAINT `Tariff_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `Trainer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trainer` ADD CONSTRAINT `Trainer_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `Hall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_hallId_fkey` FOREIGN KEY (`hallId`) REFERENCES `Hall`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
