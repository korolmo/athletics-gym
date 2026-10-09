import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_BUCKET, PHOTO_KINDS, photoUrl, storageOrigin } from "@/lib/domain/photo";

// Supabase Storage. Работает только на сервере: ключ service_role даёт полный доступ к хранилищу
// и в браузер не попадает (переменные без NEXT_PUBLIC). Браузер получает только подписанную ссылку на одну загрузку.

export class StorageNotConfigured extends Error {
  constructor() {
    super("Хранилище фото не настроено: SUPABASE_URL (https-адрес проекта) и SUPABASE_SERVICE_ROLE_KEY не заданы или заданы с ошибкой");
  }
}

let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  const url = storageOrigin(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StorageNotConfigured();
  cached ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export function isStorageConfigured(): boolean {
  return Boolean(storageOrigin(process.env.SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Прямая ссылка на Фото; пусто — пути нет или хранилище не настроено (сайт покажет картинку из public/). */
export function mediaUrl(path: string | null | undefined): string | null {
  return photoUrl(process.env.SUPABASE_URL, path);
}

/** Подписанная ссылка на загрузку одного файла по заданному пути. Действует два часа, перезаписать существующий файл по ней нельзя. */
export async function signUpload(path: string): Promise<string> {
  const { data, error } = await client().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return data.signedUrl;
}

/** Есть ли файл в хранилище — проверяем перед записью пути в базу. */
export async function objectExists(path: string): Promise<boolean> {
  const { data, error } = await client().storage.from(MEDIA_BUCKET).exists(path);
  if (error) return false;
  return data;
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await client().storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw error;
}

/** Все файлы бакета с временем создания — для поиска брошенных загрузок. */
export async function listObjects(): Promise<{ path: string; createdAt: Date | null }[]> {
  const all: { path: string; createdAt: Date | null }[] = [];
  for (const folder of PHOTO_KINDS) {
    const { data, error } = await client().storage.from(MEDIA_BUCKET).list(folder, { limit: 1000 });
    if (error) throw error;
    for (const o of data) {
      // У папок-заглушек id нет — это не файлы
      if (o.id) all.push({ path: `${folder}/${o.name}`, createdAt: o.created_at ? new Date(o.created_at) : null });
    }
  }
  return all;
}
