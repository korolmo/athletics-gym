// Prisma 7: настройки CLI (migrate, db seed, studio). Файлы .env сам CLI больше не читает — читаем здесь.
// Приложение строку подключения берёт не отсюда, а из DATABASE_URL через адаптер (src/lib/db.ts).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Без DATABASE_URL (npm install в CI, prisma generate) — пусто: generate база не нужна, migrate сам скажет, чего нет
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
