// Фото: что Владелец загружает, какие файлы принимаем и где они лежат в хранилище.
// Чистые функции без базы и сети — их используют и браузер (до загрузки), и сервер (перед выдачей ссылки).

import { HALLS, type HallId } from "@/lib/domain/tariff";

/** Бакет Supabase Storage, общий для всех Фото. Публичный: файлы читаются по прямой ссылке. */
export const MEDIA_BUCKET = "media";

/** Что принимает бакет: те же ограничения заданы в его настройках (scripts/storage-setup.ts). */
export const ALLOWED_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Браузер сжимает фото до такой длинной стороны перед загрузкой. */
export const MAX_SIDE_PX = 1600;
/** Исходный файл больше этого браузер даже не пытается открыть: телефону не хватит памяти. */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

const EXTENSION: Record<AllowedType, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

/** Куда Владелец загружает Фото. Папка в бакете совпадает с названием. */
export const PHOTO_KINDS = ["hero", "women", "gallery", "trainer", "hall", "direction"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

/**
 * Место Фото на сайте: фон первого экрана, фото Женского зала, новое фото Галереи,
 * Плакат Тренера (нужен id Тренера) или Плакат прайса (нужен Зал).
 */
export type PhotoTarget =
  | { kind: "hero" }
  | { kind: "women" }
  | { kind: "gallery" }
  | { kind: "trainer"; id: string }
  | { kind: "direction"; id: string }
  | { kind: "hall"; id: HallId };

/** Место из формы: «hero», «women», «gallery», «trainer:<id>», «direction:<id>», «hall:<general|women>». */
export function parsePhotoTarget(raw: string): PhotoTarget | null {
  const [kind, id, ...rest] = raw.split(":");
  if (rest.length > 0) return null;
  if (kind === "hero" || kind === "women" || kind === "gallery") return id === undefined ? { kind } : null;
  if (kind === "trainer" || kind === "direction") return id && /^[a-z0-9_]{1,40}$/i.test(id) ? { kind, id } : null;
  if (kind === "hall") return (HALLS as readonly string[]).includes(id ?? "") ? { kind, id: id as HallId } : null;
  return null;
}

export function formatPhotoTarget(target: PhotoTarget): string {
  return "id" in target ? `${target.kind}:${target.id}` : target.kind;
}

export type FileCheck = { ok: true; type: AllowedType } | { ok: false; error: string };

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

/** Проверка файла перед загрузкой: тип и размер. Одна и та же в браузере и на сервере. */
export function checkUpload(type: string, size: number): FileCheck {
  if (!(ALLOWED_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: "Это не фото: подходят только картинки JPEG, PNG и WebP." };
  }
  if (!Number.isInteger(size) || size <= 0) return { ok: false, error: "Файл пустой — выберите другое фото." };
  if (size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `Фото слишком большое: ${formatMegabytes(size)}. После сжатия должно быть не больше ${formatMegabytes(MAX_FILE_BYTES)}.`,
    };
  }
  return { ok: true, type: type as AllowedType };
}

/** Проверка исходного файла в браузере, до сжатия. */
export function checkSource(type: string, size: number): { ok: true } | { ok: false; error: string } {
  if (!type.startsWith("image/")) return { ok: false, error: "Это не фото. Выберите картинку из галереи телефона." };
  if (size > MAX_SOURCE_BYTES) {
    return { ok: false, error: `Файл слишком большой: ${formatMegabytes(size)}. Выберите фото поменьше.` };
  }
  return { ok: true };
}

/** Путь нового файла: имя задаёт сервер (uuid), имя файла Владельца не используется. */
export function newPhotoPath(kind: PhotoKind, type: AllowedType, uuid: string): string {
  return `${kind}/${uuid}.${EXTENSION[type]}`;
}

const PATH = /^(hero|women|gallery|trainer|hall|direction)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;

/** Наш ли это путь: папка из списка, имя — uuid, расширение — из разрешённых. Ничего другого в базу и в хранилище не идёт. */
export function isPhotoPath(path: string): boolean {
  return PATH.test(path);
}

/** Подходит ли путь к месту: Фото, загруженное для Галереи, нельзя привязать как фон первого экрана. */
export function pathMatchesKind(path: string, kind: PhotoKind): boolean {
  return isPhotoPath(path) && path.startsWith(`${kind}/`);
}

/**
 * Адрес хранилища из SUPABASE_URL: только правильный https-адрес, иначе null.
 * Опечатка в переменной (кавычки, точка с запятой, http) не должна превращаться в битые ссылки на сайте:
 * next.config.mjs по тому же правилу решает, разрешать ли хранилище для next/image и в CSP.
 */
export function storageOrigin(storageUrl: string | undefined): string | null {
  if (!storageUrl) return null;
  try {
    const url = new URL(storageUrl);
    // Имя узла — только буквы, цифры, точки и дефисы: «…supabase.co;» тоже разбирается как адрес, но это опечатка
    return url.protocol === "https:" && /^[a-z0-9.-]+$/.test(url.hostname) ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Прямая ссылка на Фото в публичном бакете. Пусто, если пути нет, он не наш или адрес хранилища
 * не задан либо задан с ошибкой, — тогда сайт показывает картинку из public/.
 */
export function photoUrl(storageUrl: string | undefined, path: string | null | undefined): string | null {
  const origin = storageOrigin(storageUrl);
  if (!origin || !path || !isPhotoPath(path)) return null;
  return `${origin}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/** Файл старше часа, на который нет ссылки из базы, — брошенная загрузка: её можно удалить. */
export const ORPHAN_AGE_MS = 60 * 60 * 1000;

/**
 * Файлы хранилища, на которые ничего не ссылается. Свежие не трогаем:
 * между загрузкой файла и записью в базу проходит время, и эту загрузку нельзя сломать.
 */
export function findOrphans(
  objects: { path: string; createdAt: Date | null }[],
  referenced: Iterable<string>,
  now: Date,
): string[] {
  const used = new Set(referenced);
  return objects
    .filter((o) => !used.has(o.path))
    .filter((o) => o.createdAt !== null && now.getTime() - o.createdAt.getTime() > ORPHAN_AGE_MS)
    .map((o) => o.path);
}

/** Сколько фото Галереи видно на сайте сразу; остальные открывает кнопка «Ещё». */
export const GALLERY_FIRST = 8;
