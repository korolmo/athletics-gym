-- Юридические страницы: Реквизиты и место хранения данных в Настройках сайта, Согласие на обработку данных у Отзыва.
-- Только добавление, все колонки необязательные: старый код их не читает, новый без значений показывает сайт без реквизитов.

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "legalBin" TEXT,
ADD COLUMN     "legalAddress" TEXT,
ADD COLUMN     "privacyEmail" TEXT,
ADD COLUMN     "dataLocationRu" TEXT,
ADD COLUMN     "dataLocationKk" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentPolicyDate" TEXT;
