import "server-only";
import fs from "node:fs/promises";
import { disk, probeStorage, storageDriver } from "./client";

// Хранилище Фото для проверок состояния (/api/health, /api/health/ready). Платформа (lib/services/health.ts)
// о Фото не знает: маршруты берут эти функции из модуля и передают ей (ADR 0015).

const MB = 1024 * 1024;
const mb = (n: number | null) => (n === null ? null : Math.round((n / MB) * 10) / 10);

/** Состояние папки Фото: драйвер, путь, запись, объём. Только для Владельца — путь к папке посторонним знать незачем. */
export async function mediaStatus(): Promise<Record<string, unknown>> {
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

/** Что нужно платформенной проверке состояния от хранилища Фото. */
export const photoStorageHealth = { probe: probeStorage, status: mediaStatus };
