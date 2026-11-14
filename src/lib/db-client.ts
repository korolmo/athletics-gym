import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import dbConfig from "../../scripts/standalone/db-config.cjs";

// Prisma 7 (без движка на Rust): запросы идут через драйвер mariadb. Строку подключения в формате Prisma
// (mysql://…?connection_limit=…&sslaccept=…) переводит в настройки драйвера общий db-config.cjs — тот же, что у миграций
// на хостинге. Здесь — без «@/…»: файл берут и скрипты (tsx), и тесты. Приложение пользуется готовым `db` из ./db.

type Adapter = NonNullable<NonNullable<ConstructorParameters<typeof PrismaClient>[0]>["adapter"]>;
type MariaDbConfig = ConstructorParameters<typeof PrismaMariaDb>[0];

/** Нет строки (сборка без базы) — ошибка только при первом запросе, как было в Prisma 6. */
function missingUrl(): Adapter {
  return {
    provider: "mysql",
    adapterName: "@prisma/adapter-mariadb",
    connect: async () => {
      throw new Error("DATABASE_URL не задана (Plesk → Node.js → Переменные среды, локально — .env).");
    },
  } as unknown as Adapter;
}

/** Клиент Prisma для строки подключения; `connectionLimit` — например, 1 для теста гонки и миграций. */
export function createPrismaClient(url: string | undefined, opts: { connectionLimit?: number } = {}): PrismaClient {
  const adapter = url ? new PrismaMariaDb(dbConfig.mariadbConfig(url, opts) as MariaDbConfig) : missingUrl();
  return new PrismaClient({ adapter });
}
