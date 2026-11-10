-- Этап П1, PR 2 (ADR 0018): «в каком городе» — отдельным полем Клуба. Название города в заголовках склоняется
-- («спортзал в Кызылорде», «Қызылордадағы спорт зал»), а правило склонения в коде не держим.

-- AlterTable
ALTER TABLE `Club` ADD COLUMN `cityInRu` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `cityInKk` VARCHAR(191) NULL;

-- Athletic's Gym — как в прежних словарях
UPDATE `Club` SET `cityInRu` = 'в Кызылорде', `cityInKk` = 'Қызылордадағы' WHERE `id` = 'club';
