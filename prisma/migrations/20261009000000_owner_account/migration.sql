-- Аккаунт Владельца: логин, хэш пароля, версия сессии. Запись одна (id = 'owner').
-- Только добавление: старый код эту таблицу не читает. Сама запись появляется при первом входе
-- по ADMIN_LOGIN / ADMIN_PASSWORD — миграция пароль не знает и запись не создаёт.

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL DEFAULT 'owner',
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Owner_login_key" ON "Owner"("login");
