-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TariffCategory" AS ENUM ('SINGLE', 'VISITS', 'UNLIMITED', 'PERSONAL');

-- CreateEnum
CREATE TYPE "Access" AS ENUM ('DAY', 'FULL');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ALL', 'STUDENTS', 'WOMEN', 'MEN');

-- CreateTable
CREATE TABLE "Hall" (
    "id" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameKk" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Hall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "trainerId" TEXT,
    "category" "TariffCategory" NOT NULL,
    "titleRu" TEXT,
    "titleKk" TEXT,
    "visitsPerMonth" INTEGER,
    "durationMonths" INTEGER,
    "access" "Access" NOT NULL DEFAULT 'FULL',
    "audience" "Audience" NOT NULL DEFAULT 'ALL',
    "price" INTEGER NOT NULL,
    "priceTo" INTEGER,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trainer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "photo" TEXT,
    "descriptionRu" TEXT,
    "descriptionKk" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tariff_hallId_category_idx" ON "Tariff"("hallId", "category");

-- CreateIndex
CREATE INDEX "Tariff_trainerId_idx" ON "Tariff"("trainerId");

-- CreateIndex
CREATE INDEX "Trainer_hallId_idx" ON "Trainer"("hallId");

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tariff" ADD CONSTRAINT "Tariff_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

