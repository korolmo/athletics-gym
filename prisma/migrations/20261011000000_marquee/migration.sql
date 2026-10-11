-- Бегущая строка под первым экраном: пункты ленты (RU и KZ) и показ на сайте.
-- Только добавление: старый код эти колонки не читает и берёт слова ленты из словарей.

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "marqueeKk" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "marqueeRu" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "showMarquee" BOOLEAN NOT NULL DEFAULT true;

-- Начальные пункты — те же, что в src/lib/domain/site-settings.defaults.ts (совпадение проверяет тест).
-- {часы} и {рейтинг} сайт подставляет из Настроек сайта: часы работы и оценка 2ГИС.
UPDATE "SiteSettings"
SET "marqueeRu" = ARRAY['ПЕРВОЕ ПОСЕЩЕНИЕ БЕСПЛАТНО', 'ОТДЕЛЬНЫЙ ЖЕНСКИЙ ЗАЛ', '{часы}', '{рейтинг} В 2ГИС', 'ПЕРСОНАЛЬНЫЕ ТРЕНИРОВКИ', 'СТУДЕНТАМ ДЕШЕВЛЕ'],
    "marqueeKk" = ARRAY['АЛҒАШҚЫ КЕЛУ ТЕГІН', 'БӨЛЕК ӘЙЕЛДЕР ЗАЛЫ', '{часы}', '2ГИС-ТЕ {рейтинг}', 'ЖЕКЕ ЖАТТЫҒУЛАР', 'СТУДЕНТТЕРГЕ АРЗАН']
WHERE "id" = 'site';
