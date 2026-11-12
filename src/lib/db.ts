import type { PrismaClient } from "../generated/prisma/client";
import { createPrismaClient } from "./db-client";

// Один клиент на процесс (в разработке — переживает перезагрузку модулей). Подключение — src/lib/db-client.ts.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient(process.env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
