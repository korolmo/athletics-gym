import "server-only";
import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { DEFAULT_MEDIA_QUOTA_MB, PHOTO_KINDS, basePhotoPath, photoFiles } from "@/lib/domain/photo";
import { MediaFileExists, StorageNotConfigured } from "./errors";

// Драйвер «диск хостинга» (STORAGE_DRIVER=local, ADR 0004). Фото лежат в папке MEDIA_DIR — вне папки приложения,
// которую перезаписывает выкатка из ветки deploy. Раздаёт их src/app/media, принимает src/app/api/admin/media.
// Путь к файлу всегда проходит basePhotoPath: только наши папки, имя-uuid и разрешённое расширение — без «..» и слешей.

const MB = 1024 * 1024;

/** Папка Фото: MEDIA_DIR (относительный путь — от папки приложения), по умолчанию media рядом с папкой приложения. */
export function mediaDir(): string {
  const raw = process.env.MEDIA_DIR?.trim();
  return raw ? path.resolve(raw) : path.resolve(process.cwd(), "..", "media");
}

/** Лимит общего объёма Фото: MEDIA_QUOTA_MB, по умолчанию 500 МБ. */
export function quotaBytes(): number {
  const mb = Number(process.env.MEDIA_QUOTA_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_MEDIA_QUOTA_MB) * MB;
}

/** Абсолютный путь файла внутри MEDIA_DIR; чужой путь — ошибка. */
function fileOf(rel: string): string {
  if (basePhotoPath(rel) === null) throw new Error(`Не путь Фото: ${rel}`);
  const root = mediaDir();
  const full = path.resolve(root, ...rel.split("/"));
  if (!full.startsWith(root + path.sep)) throw new Error(`Путь вне папки Фото: ${rel}`);
  return full;
}

function isMissing(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "ENOENT";
}

export async function objectExists(rel: string): Promise<boolean> {
  try {
    return (await fs.stat(fileOf(rel))).isFile();
  } catch {
    return false;
  }
}

/** Удаляет Фото вместе с уменьшенными копиями. Файла уже нет — не ошибка. */
export async function removeObjects(paths: string[]): Promise<void> {
  for (const file of paths.flatMap(photoFiles)) {
    try {
      await fs.unlink(fileOf(file));
    } catch (e) {
      if (!isMissing(e)) throw e;
    }
  }
}

/** Все наши файлы в папках Фото — для уборки брошенных загрузок. Чужие файлы (не по правилу имён) не трогаем. */
export async function listObjects(): Promise<{ path: string; createdAt: Date | null; size: number }[]> {
  const all: { path: string; createdAt: Date | null; size: number }[] = [];
  for (const folder of PHOTO_KINDS) {
    let names: string[];
    try {
      names = await fs.readdir(path.join(mediaDir(), folder));
    } catch (e) {
      if (isMissing(e)) continue;
      throw e;
    }
    for (const name of names) {
      const rel = `${folder}/${name}`;
      if (basePhotoPath(rel) === null) continue;
      const st = await fs.stat(fileOf(rel)).catch(() => null);
      if (st?.isFile()) all.push({ path: rel, createdAt: st.mtime, size: st.size });
    }
  }
  return all;
}

/** Сколько места занимают все файлы в MEDIA_DIR (включая чужие и недогруженные) — для лимита объёма. */
export async function usedBytes(): Promise<number> {
  let total = 0;
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (isMissing(e)) return;
      throw e;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) total += (await fs.stat(full).catch(() => ({ size: 0 }))).size;
    }
  }
  await walk(mediaDir());
  return total;
}

/** Проверка готовности (/api/health/ready): папка Фото есть или создаётся, и в неё можно писать. */
export async function probe(): Promise<void> {
  await fs.mkdir(mediaDir(), { recursive: true });
  await fs.access(mediaDir(), fs.constants.W_OK);
}

/** Свободное место на разделе, где лежит MEDIA_DIR; null — узнать нельзя. */
export async function freeBytes(): Promise<number | null> {
  try {
    const st = await fs.statfs(mediaDir());
    return st.bavail * st.bsize;
  } catch {
    return null;
  }
}

/**
 * Записывает файл. Сначала во временный файл, потом ссылкой на окончательное имя: файл виден либо целиком,
 * либо никак, а существующий файл не перезаписывается (имена уникальные — повтор значит ошибку).
 */
export async function writeObject(rel: string, bytes: Uint8Array): Promise<void> {
  const target = fileOf(rel);
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
  } catch (e) {
    throw new StorageNotConfigured(`папку ${mediaDir()} нельзя создать (${(e as Error).message})`);
  }
  const temp = `${target}.part-${crypto.randomUUID()}`;
  await fs.writeFile(temp, bytes, { flag: "wx" });
  try {
    await fs.link(temp, target);
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "EEXIST") throw new MediaFileExists(rel);
    throw e;
  } finally {
    await fs.unlink(temp).catch(() => {});
  }
}

/** Файл для раздачи: поток и размер; null — такого файла нет. */
export async function openObject(rel: string): Promise<{ body: ReadableStream<Uint8Array>; size: number; mtime: Date } | null> {
  let full: string;
  try {
    full = fileOf(rel);
  } catch {
    return null;
  }
  const st = await fs.stat(full).catch(() => null);
  if (!st?.isFile()) return null;
  const body = Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>;
  return { body, size: st.size, mtime: st.mtime };
}
