import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import v8 from "node:v8";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { disk, probeStorage, storageDriver } from "@/lib/storage/client";
import { createDependencyCheck, type ReadyChecks } from "@/lib/domain/health";
import { appEnv } from "@/lib/seo";
import { accessLogStats } from "@/lib/observability/access-log";
import { release } from "@/lib/observability/log";

// Состояние сервера для /api/health — проверка хостинга при первом запуске и после выкатки (ADR 0004).
// Только для Владельца: путь к папке Фото и версии программ посторонним знать незачем. Секретов здесь нет.
// Готовность для /api/health/ready (getReadiness) — без сессии: наружу маршрут отдаёт только ok / fail.

/** База и хранилище Фото: запрос — с тайм-аутом READY_TIMEOUT_MS, первое соединение процесса — CONNECT_TIMEOUT_MS. */
const checkDatabase = createDependencyCheck(() => db.$queryRaw`SELECT 1`, { connect: () => db.$connect() });
const checkStorage = createDependencyCheck(probeStorage);

export async function getReadiness(): Promise<ReadyChecks> {
  const [database, storage] = await Promise.all([checkDatabase(), checkStorage()]);
  return { database, storage };
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

async function media() {
  if (storageDriver() !== "local") return { driver: storageDriver() };
  const [used, free] = await Promise.all([disk.usedBytes().catch(() => null), disk.freeBytes()]);
  let writable = false;
  try {
    await fs.mkdir(disk.dir(), { recursive: true });
    await fs.access(disk.dir(), fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }
  return { driver: "local", dir: disk.dir(), writable, usedMb: mb(used), quotaMb: mb(disk.quotaBytes()), freeOnDiskMb: mb(free) };
}

export async function getHealth() {
  await requireOwner();
  const memory = process.memoryUsage();
  const [osName, dbState, mediaState, ready] = await Promise.all([osRelease(), database(), media(), getReadiness()]);
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
