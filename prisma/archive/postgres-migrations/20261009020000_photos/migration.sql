-- Этап 2: Фото из хранилища. В базе — только пути к файлам (бакет media в Supabase Storage).
-- Только добавление: новые колонки необязательные, старый код их не читает.
-- Trainer.photo (файл из public/) остаётся как есть: загруженный Плакат Тренера лежит в отдельной колонке.

-- AlterTable
ALTER TABLE "Hall" ADD COLUMN     "pricePoster" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "heroPhoto" TEXT,
ADD COLUMN     "womenPhoto" TEXT;

-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "uploadedPhoto" TEXT;

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "captionRu" TEXT,
    "captionKk" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GalleryPhoto_path_key" ON "GalleryPhoto"("path");

-- CreateIndex
CREATE INDEX "GalleryPhoto_sortOrder_idx" ON "GalleryPhoto"("sortOrder");

