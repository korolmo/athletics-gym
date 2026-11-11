-- Этап П1, PR 4 (ADR 0018, решения 12 и 16): логотип Клуба и Зала — одно поле с адресом.
--   «/…»          — файл из public/ (нынешние логотипы Athletic's Gym);
--   «gallery/…»   — загруженное Фото (адрес /media/…);
--   пусто         — монограмма из названия Клуба (у Зала — логотип Клуба).
-- Athletic's Gym переносится один в один: общий логотип и логотип Женского зала — прежние файлы.

-- AlterTable (MariaDB 10.4: RENAME COLUMN ещё нет — CHANGE)
ALTER TABLE `Club` CHANGE COLUMN `logoPhoto` `logo` VARCHAR(191) NULL;
UPDATE `Club` SET `logo` = '/logo.png?v=2' WHERE `id` = 'club';

-- AlterTable
ALTER TABLE `Hall` ADD COLUMN `logo` VARCHAR(191) NULL;
UPDATE `Hall` SET `logo` = '/logo-women.png?v=1' WHERE `id` = 'women';
