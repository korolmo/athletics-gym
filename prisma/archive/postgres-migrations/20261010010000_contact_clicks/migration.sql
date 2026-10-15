-- Обращения: счётчик нажатий на кнопки связи. Только добавление: старый код таблицу не читает.
-- Персональных данных в таблице нет: Канал, место на сайте, язык и время.

-- CreateTable
CREATE TABLE "ContactClick" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactClick_createdAt_idx" ON "ContactClick"("createdAt");
