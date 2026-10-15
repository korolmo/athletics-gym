-- Этап 5: Отзывы. Только добавление: старый код новые таблицы не читает, новая колонка имеет значение по умолчанию.
-- Демо-отзывов нет: таблица Review после миграции пустая.

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('SITE', 'TWOGIS', 'INSTAGRAM', 'GOOGLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NEW', 'PUBLISHED', 'HIDDEN');

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "showReviews" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "hallId" TEXT,
    "source" "ReviewSource" NOT NULL,
    "sourceUrl" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'NEW',
    "fromVisitor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSubmission" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_status_reviewedAt_idx" ON "Review"("status", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewSubmission_ipHash_createdAt_idx" ON "ReviewSubmission"("ipHash", "createdAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

