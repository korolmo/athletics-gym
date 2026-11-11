-- Этап П1, PR 7 (ADR 0019): суточный сброс демо-админки Лаборатории. Одна строка: снимок исходного состояния
-- (то, что может менять Гость), когда был последний сброс и сколько он шёл, и блокировка от двух сбросов сразу.

-- CreateTable
CREATE TABLE `DemoState` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'lab',
    `snapshot` LONGTEXT NULL,
    `snapshotAt` DATETIME(3) NULL,
    `lastResetAt` DATETIME(3) NULL,
    `lastResetMs` INTEGER NULL,
    `lockedUntil` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
