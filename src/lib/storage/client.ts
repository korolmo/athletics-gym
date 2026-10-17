import "server-only";
import { checkQuota, localPhotoUrl, photoFiles } from "@/lib/domain/photo";
import * as local from "./local";
import * as supabase from "./supabase";

// Хранилище Фото — единственный вход для остального кода. Драйвер выбирает STORAGE_DRIVER:
// local (по умолчанию) — диск хостинга hoster.kz, папка MEDIA_DIR (ADR 0004);
// supabase — Supabase Storage, как на Vercel до переезда (ADR 0002).
// Путь из базы — всегда путь самого Фото; его уменьшенные копии (photoFiles) хранилище держит рядом.

export { StorageNotConfigured, MediaFileExists } from "./errors";

export type StorageDriver = "local" | "supabase";

export function storageDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === "supabase" ? "supabase" : "local";
}

export function isStorageConfigured(): boolean {
  return storageDriver() === "local" ? true : supabase.isStorageConfigured();
}

/** Ссылка на Фото для сайта; пусто — пути нет или хранилище не настроено (сайт покажет картинку из public/). */
export function mediaUrl(path: string | null | undefined): string | null {
  return storageDriver() === "local" ? localPhotoUrl(path) : supabase.mediaUrl(path);
}

/**
 * Куда браузеру загрузить каждый файл (PUT). Диск — наш обработчик /api/admin/media с проверкой сессии;
 * Supabase — подписанная ссылка на одну загрузку.
 */
export async function uploadUrls(files: string[]): Promise<string[]> {
  if (storageDriver() === "local") return files.map((f) => `/api/admin/media/${f}`);
  return Promise.all(files.map((f) => supabase.signUpload(f)));
}

/** Загружены ли все файлы Фото — проверяем перед записью пути в базу. */
export async function photoUploaded(path: string): Promise<boolean> {
  const files = photoFiles(path);
  const check = storageDriver() === "local" ? local.objectExists : supabase.objectExists;
  return (await Promise.all(files.map(check))).every(Boolean);
}

/** Удаляет Фото вместе с уменьшенными копиями. */
export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  if (storageDriver() === "local") return local.removeObjects(paths);
  return supabase.removeObjects(paths.flatMap(photoFiles));
}

/** Все файлы хранилища с временем появления — для уборки брошенных загрузок. */
export async function listObjects(): Promise<{ path: string; createdAt: Date | null }[]> {
  return storageDriver() === "local" ? local.listObjects() : supabase.listObjects();
}

/** Отвечает ли хранилище Фото — для /api/health/ready (тайм-аут ставит вызывающий). */
export async function probeStorage(): Promise<void> {
  return storageDriver() === "local" ? local.probe() : supabase.probe();
}

/** Поместятся ли новые файлы в лимит объёма Фото. У Supabase свой лимит, здесь не считаем. */
export async function checkSpace(incomingBytes: number): Promise<{ ok: true } | { ok: false; error: string }> {
  if (storageDriver() !== "local") return { ok: true };
  return checkQuota(await local.usedBytes(), incomingBytes, local.quotaBytes());
}

/** Для обработчиков /media и /api/admin/media и для /api/health: работают только с драйвером local. */
export const disk = {
  dir: local.mediaDir,
  quotaBytes: local.quotaBytes,
  usedBytes: local.usedBytes,
  freeBytes: local.freeBytes,
  write: local.writeObject,
  open: local.openObject,
};
