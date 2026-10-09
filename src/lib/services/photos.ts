import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import {
  checkUpload,
  findOrphans,
  isPhotoPath,
  newPhotoPath,
  parsePhotoTarget,
  pathMatchesKind,
  type PhotoTarget,
} from "@/lib/domain/photo";
import * as storage from "@/lib/storage/client";
import type { GalleryCaptionInput } from "@/lib/validation/gallery";
import { SETTINGS_ID } from "./site";
import type { ServiceResult } from "./result";

// Фото в админке: выдача ссылки на загрузку, привязка загруженного файла к месту на сайте, Галерея.
// Каждая функция сама проверяет сессию Владельца. В базе — только путь к файлу; сам файл — в хранилище.
// Правило: файл в хранилище без записи в базе не остаётся — при замене, удалении и неудачном сохранении он убирается.

const BAD_TARGET = "Не удалось определить, куда загружается фото. Обновите страницу.";
const NOT_CONFIGURED = "Хранилище фото не настроено. Сообщите разработчику.";
const STORAGE_FAILED = "Хранилище фото не отвечает. Попробуйте ещё раз чуть позже.";

function storageError(e: unknown): string {
  if (e instanceof storage.StorageNotConfigured) return NOT_CONFIGURED;
  console.error("Хранилище фото: ошибка.", e);
  return STORAGE_FAILED;
}

/** Убирает файлы из хранилища; ошибка не мешает основному действию — такие файлы подберёт уборка. */
async function removeQuietly(paths: (string | null | undefined)[]): Promise<void> {
  const own = paths.filter((p): p is string => typeof p === "string" && isPhotoPath(p));
  if (own.length === 0) return;
  try {
    await storage.removeObjects(own);
  } catch (e) {
    console.error("Хранилище фото: не удалось удалить файлы, останутся до уборки.", own, e);
  }
}

/** Есть ли место, к которому привязывается Фото: Тренер мог быть удалён в другой вкладке. */
async function targetExists(target: PhotoTarget): Promise<boolean> {
  if (target.kind === "trainer") return (await db.trainer.count({ where: { id: target.id } })) > 0;
  if (target.kind === "hall") return (await db.hall.count({ where: { id: target.id } })) > 0;
  return true;
}

/**
 * Шаг 1 загрузки. Проверяет тип и размер файла и выдаёт подписанную ссылку: по ней браузер
 * загружает файл в хранилище напрямую. Путь и имя файла задаёт сервер.
 */
export async function requestUpload(
  targetRaw: string,
  type: string,
  size: number,
): Promise<ServiceResult<{ path: string; uploadUrl: string }>> {
  await requireOwner();
  const target = parsePhotoTarget(targetRaw);
  if (!target) return { ok: false, error: BAD_TARGET };
  const check = checkUpload(type, size);
  if (!check.ok) return check;
  if (!(await targetExists(target))) return { ok: false, error: NOT_FOUND_MESSAGE };

  const path = newPhotoPath(target.kind, check.type, crypto.randomUUID());
  try {
    return { ok: true, path, uploadUrl: await storage.signUpload(path) };
  } catch (e) {
    return { ok: false, error: storageError(e) };
  }
}

/** Записывает путь в базу и возвращает путь, который был там раньше. */
async function saveToTarget(target: PhotoTarget, path: string): Promise<string | null> {
  switch (target.kind) {
    case "hero":
    case "women": {
      const column = target.kind === "hero" ? "heroPhoto" : "womenPhoto";
      const before = await db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { [column]: true } });
      await db.siteSettings.update({ where: { id: SETTINGS_ID }, data: { [column]: path } });
      return (before as Record<string, string | null> | null)?.[column] ?? null;
    }
    case "trainer": {
      const before = await db.trainer.findUnique({ where: { id: target.id }, select: { uploadedPhoto: true } });
      await db.trainer.update({ where: { id: target.id }, data: { uploadedPhoto: path } });
      return before?.uploadedPhoto ?? null;
    }
    case "hall": {
      const before = await db.hall.findUnique({ where: { id: target.id }, select: { pricePoster: true } });
      await db.hall.update({ where: { id: target.id }, data: { pricePoster: path } });
      return before?.pricePoster ?? null;
    }
    case "gallery": {
      // Новое фото встаёт в конец Галереи
      const last = await db.galleryPhoto.aggregate({ _max: { sortOrder: true } });
      await db.galleryPhoto.create({ data: { path, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
      return null;
    }
  }
}

/**
 * Шаг 2 загрузки. Привязывает загруженный файл к месту на сайте.
 * Прежний файл этого места удаляется из хранилища. Если запись в базу не удалась — удаляется новый файл.
 */
export async function attachPhoto(targetRaw: string, path: string): Promise<ServiceResult<object>> {
  await requireOwner();
  const target = parsePhotoTarget(targetRaw);
  if (!target) return { ok: false, error: BAD_TARGET };
  // Путь приходит из браузера: принимаем только наш формат и только из папки этого места
  if (!pathMatchesKind(path, target.kind)) return { ok: false, error: BAD_TARGET };

  try {
    if (!(await storage.objectExists(path))) {
      return { ok: false, error: "Фото не загрузилось. Попробуйте ещё раз." };
    }
  } catch (e) {
    return { ok: false, error: storageError(e) };
  }

  let previous: string | null;
  try {
    previous = await saveToTarget(target, path);
  } catch (e) {
    await removeQuietly([path]);
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  if (previous !== path) await removeQuietly([previous]);
  await sweepOrphans();
  return { ok: true };
}

/** Загрузка сорвалась на стороне браузера: убираем файл, если он успел появиться и ни к чему не привязан. */
export async function discardUpload(path: string): Promise<void> {
  await requireOwner();
  if (!isPhotoPath(path)) return;
  if ((await referencedPaths()).has(path)) return;
  await removeQuietly([path]);
}

/** Убирает Фото с места (кроме Галереи): на сайте снова покажется картинка из public/. Файл удаляется из хранилища. */
export async function removePhoto(targetRaw: string): Promise<ServiceResult<object>> {
  await requireOwner();
  const target = parsePhotoTarget(targetRaw);
  if (!target || target.kind === "gallery") return { ok: false, error: BAD_TARGET };

  let previous: string | null = null;
  try {
    if (target.kind === "hero" || target.kind === "women") {
      const column = target.kind === "hero" ? "heroPhoto" : "womenPhoto";
      const before = await db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { [column]: true } });
      previous = (before as Record<string, string | null> | null)?.[column] ?? null;
      if (previous) await db.siteSettings.update({ where: { id: SETTINGS_ID }, data: { [column]: null } });
    } else if (target.kind === "trainer") {
      previous = (await db.trainer.findUnique({ where: { id: target.id }, select: { uploadedPhoto: true } }))?.uploadedPhoto ?? null;
      if (previous) await db.trainer.update({ where: { id: target.id }, data: { uploadedPhoto: null } });
    } else {
      previous = (await db.hall.findUnique({ where: { id: target.id }, select: { pricePoster: true } }))?.pricePoster ?? null;
      if (previous) await db.hall.update({ where: { id: target.id }, data: { pricePoster: null } });
    }
  } catch (e) {
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  await removeQuietly([previous]);
  return { ok: true };
}

// ——— Галерея ———

const galleryOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Все фото Галереи, включая скрытые, со ссылками для показа в админке. */
export async function listGallery() {
  await requireOwner();
  const photos = await db.galleryPhoto.findMany({ orderBy: galleryOrder });
  return photos.map((p) => ({ ...p, url: storage.mediaUrl(p.path) }));
}

export async function getGalleryPhoto(id: string) {
  await requireOwner();
  const photo = await db.galleryPhoto.findUnique({ where: { id } });
  return photo ? { ...photo, url: storage.mediaUrl(photo.path) } : null;
}

export async function saveGalleryCaption(input: GalleryCaptionInput): Promise<ServiceResult<object>> {
  await requireOwner();
  const { id, ...data } = input;
  try {
    await db.galleryPhoto.update({ where: { id }, data });
  } catch (e) {
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  return { ok: true };
}

export async function toggleGalleryPhoto(id: string): Promise<void> {
  await requireOwner();
  const photo = await db.galleryPhoto.findUnique({ where: { id } });
  if (photo) await db.galleryPhoto.updateMany({ where: { id }, data: { isVisible: !photo.isVisible } });
}

/** Сдвигает фото на одно место вверх или вниз; порядок всех фото записывается заново, без пропусков и повторов. */
export async function moveGalleryPhoto(id: string, direction: "up" | "down"): Promise<void> {
  await requireOwner();
  const photos = await db.galleryPhoto.findMany({ orderBy: galleryOrder, select: { id: true } });
  const from = photos.findIndex((p) => p.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= photos.length) return;
  [photos[from], photos[to]] = [photos[to], photos[from]];
  await db.$transaction(photos.map((p, i) => db.galleryPhoto.update({ where: { id: p.id }, data: { sortOrder: i } })));
}

/** Удаляет фото Галереи: запись — из базы, файл — из хранилища. */
export async function deleteGalleryPhoto(id: string): Promise<void> {
  await requireOwner();
  const photo = id ? await db.galleryPhoto.findUnique({ where: { id } }) : null;
  if (!photo) return;
  await db.galleryPhoto.deleteMany({ where: { id } });
  await removeQuietly([photo.path]);
}

// ——— Места с одним Фото и уборка ———

/** Фото первого экрана, Женского зала и Плакаты прайса — для раздела «Фото». */
export async function getSinglePhotos() {
  await requireOwner();
  const [settings, halls] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { heroPhoto: true, womenPhoto: true } }),
    db.hall.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, pricePoster: true } }),
  ]);
  return {
    configured: storage.isStorageConfigured(),
    hero: storage.mediaUrl(settings?.heroPhoto),
    women: storage.mediaUrl(settings?.womenPhoto),
    posters: Object.fromEntries(halls.map((h) => [h.id, storage.mediaUrl(h.pricePoster)])) as Record<string, string | null>,
  };
}

/** Все пути к Фото, на которые ссылается база. */
async function referencedPaths(): Promise<Set<string>> {
  const [settings, halls, trainers, gallery] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { heroPhoto: true, womenPhoto: true } }),
    db.hall.findMany({ select: { pricePoster: true } }),
    db.trainer.findMany({ where: { uploadedPhoto: { not: null } }, select: { uploadedPhoto: true } }),
    db.galleryPhoto.findMany({ select: { path: true } }),
  ]);
  const all = [
    settings?.heroPhoto,
    settings?.womenPhoto,
    ...halls.map((h) => h.pricePoster),
    ...trainers.map((t) => t.uploadedPhoto),
    ...gallery.map((g) => g.path),
  ];
  return new Set(all.filter((p): p is string => Boolean(p)));
}

/**
 * Уборка: удаляет из хранилища файлы старше часа, на которые не ссылается база, —
 * загрузки, брошенные на полпути (закрыли вкладку, пропала связь). Запускается после каждой успешной загрузки.
 * Ошибка уборки основному действию не мешает.
 */
export async function sweepOrphans(): Promise<number> {
  await requireOwner();
  try {
    const orphans = findOrphans(await storage.listObjects(), await referencedPaths(), new Date());
    await storage.removeObjects(orphans);
    return orphans.length;
  } catch (e) {
    console.error("Хранилище фото: уборка не удалась.", e);
    return 0;
  }
}
