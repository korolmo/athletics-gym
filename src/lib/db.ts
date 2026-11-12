import type { PrismaClient } from "../generated/prisma/client";
import { createPrismaClient } from "./db-client";

// Один клиент на процесс — и в production тоже. Сборка может вычислить этот модуль не один раз (по разу на маршрут),
// а у клиента Prisma 7 свой компилятор запросов (WASM) и свой пул драйвера: несколько копий на 256 МБ хостинга
// не помещаются. Поэтому клиент живёт в globalThis. Подключение — src/lib/db-client.ts.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = (globalForPrisma.prisma ??= createPrismaClient(process.env.DATABASE_URL));
