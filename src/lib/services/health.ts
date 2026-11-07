import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import v8 from "node:v8";
import { db } from "@/lib/db";
import { createDependencyCheck, type ReadyChecks } from "@/lib/domain/health";
import { appEnv } from "@/lib/seo";
import { accessLogStats } from "@/lib/observability/access-log";
import { release } from "@/lib/observability/log";

// Состояние сервера для /api/health — проверка хостинга при первом запуске и после выкатки (ADR 0004).
// Только для Владельца: путь к папке Фото и версии программ посторонним знать незачем. Секретов здесь нет.
// Готовность для /api/health/ready (getReadiness) — без сессии: наружу маршрут отдаёт только ok / fail.

/** База и хранилище Фото: запрос — с тайм-аутом READY_TIMEOUT_MS, первое соединение процесса — CONNECT_TIMEOUT_MS. */
const checkDatabase = createDependencyCheck(() => db.$queryRaw`SELECT 1`, { connect: () => db.$connect() });

/**
 * Хранилище Фото — модуль, а это платформа: она о модулях не знает (ADR 0015). Маршруты /api/health*
 * берут проверку из `@/modules/photos` (photoStorageHealth) и передают сюда.
 */
export type StorageHealth = { probe: () => Promise<void>; status: () => Promise<Record<string, unknown>> };

// Проверка хранилища запоминает первое успешное соединение процесса — поэтому одна на процесс
let checkStorage: ReturnType<typeof createDependencyCheck> | null = null;
function storageCheck(storage: StorageHealth) {
  return (checkStorage ??= createDependencyCheck(storage.probe));
}

export async function getReadiness(storage: StorageHealth): Promise<ReadyChecks> {
  const [database, storageState] = await Promise.all([checkDatabase(), storageCheck(storage)()]);
  return { database, storage: storageState };
}

const MB = 1024 * 1024;
const mb = (n: number | null) => (n === null ? null : Math.round((n / MB) * 10) / 10);

async function osRelease(): Promise<string | null> {
  try {
    const text = await fs.readFile("/etc/os-release", "utf8");
    return /^PRETTY_NAME="?([^"\n]*)"?$/m.exec(text)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function database() {
  const started = Date.now();
  try {
    // sql_mode: без STRICT_TRANS_TABLES MariaDB молча обрезает слишком длинный текст, а не отказывает
    const [row] = await db.$queryRaw<{ version: string; sqlMode: string; timeZone: string }[]>`
      SELECT VERSION() AS version, @@SESSION.sql_mode AS sqlMode, @@SESSION.time_zone AS timeZone`;
    const [last] = await db.$queryRaw<{ name: string }[]>`
      SELECT migration_name AS name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`;
    return {
      ok: true,
      version: row?.version ?? null,
      strict: /STRICT_(TRANS|ALL)_TABLES/.test(row?.sqlMode ?? ""),
      sqlMode: row?.sqlMode ?? null,
      timeZone: row?.timeZone ?? null,
      lastMigration: last?.name ?? null,
      ms: Date.now() - started,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.split("\n").slice(-1)[0] : String(e), ms: Date.now() - started };
  }
}

/**
 * Только для Владельца. Проверку сессии передаёт маршрут (requireOwner из модуля Аккаунт Владельца):
 * платформа о модулях не знает (ADR 0015) — как и хранилище Фото выше.
 */
export async function getHealth(storage: StorageHealth, ensureOwner: () => Promise<void>) {
  await ensureOwner();
  const memory = process.memoryUsage();
  const [osName, dbState, mediaState, ready] = await Promise.all([osRelease(), database(), storage.status(), getReadiness(storage)]);
  return {
    ok: dbState.ok && ready.storage.ok,
    appEnv: appEnv(),
    release: release(),
    accessLog: accessLogStats(),
    node: process.version,
    os: { platform: process.platform, arch: process.arch, release: os.release(), name: osName },
    openssl: process.versions.openssl,
    memoryMb: {
      rss: mb(memory.rss),
      heapUsed: mb(memory.heapUsed),
      heapTotal: mb(memory.heapTotal),
      external: mb(memory.external),
      heapLimit: mb(v8.getHeapStatistics().heap_size_limit),
      systemFree: mb(os.freemem()),
    },
    uptimeSec: Math.round(process.uptime()),
    database: dbState,
    media: mediaState,
    ready,
  };
}
