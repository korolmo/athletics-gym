-- Этап П1 (ADR 0018): Клуб — бренд, город и пояс как данные. Строка Athletic's Gym переносится один в один
-- с прежними константами кода (src/lib/site.ts, словари, src/lib/time.ts); тест на MariaDB сверяет её с DEFAULT_CLUB.

-- CreateTable
CREATE TABLE `Club` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'club',
    `name` VARCHAR(191) NOT NULL,
    `cityRu` VARCHAR(191) NOT NULL,
    `cityKk` VARCHAR(191) NULL,
    `seoDescriptionRu` TEXT NOT NULL,
    `seoDescriptionKk` TEXT NULL,
    `foundedYear` INTEGER NULL,
    `accentColor` VARCHAR(191) NOT NULL,
    `logoPhoto` VARCHAR(191) NULL,
    `twoGisUrl` VARCHAR(191) NULL,
    `twoGisReviewsUrl` VARCHAR(191) NULL,
    `twoGisRouteUrl` TEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `timeZone` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Athletic's Gym
INSERT INTO `Club` (`id`, `name`, `cityRu`, `cityKk`, `seoDescriptionRu`, `seoDescriptionKk`, `foundedYear`, `accentColor`, `logoPhoto`, `twoGisUrl`, `twoGisReviewsUrl`, `twoGisRouteUrl`, `latitude`, `longitude`, `timeZone`, `updatedAt`) VALUES (
    'club',
    'Athletic''s Gym',
    'Кызылорда',
    'Қызылорда',
    'Спортзал в Кызылорде: тренажёрный зал с новыми тренажёрами, отдельный женский зал, персональные тренировки с тренером. Первое посещение бесплатно.',
    'Қызылордадағы спорт зал: жаңа тренажерлар, бөлек әйелдер залы, жаттықтырушымен жеке жаттығулар. Алғашқы келу тегін.',
    2022,
    '#f5e642',
    NULL,
    'https://2gis.kz/kyzylorda/firm/70000001069365221',
    'https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews',
    'https://2gis.kz/kyzylorda/directions/points/%7C65.512295%2C44.784253%3B70000001069365221',
    44.784253,
    65.512295,
    'Asia/Qyzylorda',
    CURRENT_TIMESTAMP(3)
);
