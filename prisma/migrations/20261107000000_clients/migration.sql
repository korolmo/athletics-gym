-- Этап 1 (ADR 0016): Клиент и одноразовые коды входа в личный кабинет.

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sessionVersion` INTEGER NOT NULL DEFAULT 1,
    `consentAt` DATETIME(3) NOT NULL,
    `consentPolicyDate` VARCHAR(191) NOT NULL,
    `lastLoginAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_phone_key`(`phone`),
    INDEX `Client_lastLoginAt_idx`(`lastLoginAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientLoginCode` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClientLoginCode_phone_createdAt_idx`(`phone`, `createdAt`),
    INDEX `ClientLoginCode_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

