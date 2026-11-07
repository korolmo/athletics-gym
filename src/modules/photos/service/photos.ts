import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requireOwner } from "@/modules/owner";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import {
  checkUpload,
  findOrphans,
  isPhotoPath,
  newPhotoPath,
  parsePhotoTarget,
  photoFiles,
  PHOTO_KINDS,
  PHOTO_VARIANTS,
  pathMatchesKind,
  type PhotoKind,
  type PhotoTarget,
} from "../domain/photo";
import * as storage from "../storage/client";
import type { GalleryCaptionInput } from "../validation/gallery";
import type { ServiceResult } from "@/lib/services/result";
import { logError } from "@/lib/observability/log";

// Фото в админке: выдача ссылки на загрузку, привязка загруженного файла к месту на сайте, Галерея.
// Каждая функция сама проверяет сессию Владельца. В базе — только путь к файлу; сам файл — в хранилище.
// Правило: файл в хранилище без записи в базе не остаётся — при замене, удалении и неудачном сохранении он убирается.

const BAD_TARGET = "Не удалось определить, куда загружается фото. Обновите страницу.";
const NOT_CONFIGURED = "Хранилище фото не настроено. Сообщите разработчику.";
const STORAGE_FAILED = "Хранилище фото не отвечает. Попробуйте ещё раз чуть позже.";

function storageError(e: unknown): string {
  if (e instanceof storage.StorageNotConfigured) return NOT_CONFIGURED;
  logError("Хранилище фото: ошибка.", e);
  return STORAGE_FAILED;
}

/** Убирает файлы из хранилища; ошибка не мешает основному действию — такие файлы подберёт уборка. */
async function removeQuietly(paths: (string | null | undefined)[]): Promise<void> {
  const own = paths.filter((p): p is string => typeof p === "string" && isPhotoPath(p));
  if (own.length === 0) return;
  try {
    await storage.removeObjects(own);
  } catch (e) {
    logError(`Хранилище фото: не удалось удалить файлы (${own.length}), останутся до уборки.`, e);
  }
}

/**
 * Место для Фото, которое ведёт модуль-владелец (ADR 0015, «Места для Фото»): Фото не знает чужих таблиц,
 * а владелец не знает хранилища. Фото выдаёт путь, кладёт файл, убирает старый; владелец хранит путь у себя.
 * Места собирает слой приложения (app/admin/(protected)/photos/slots.ts) и передаёт в функции этого сервиса.
 */
export type PhotoSlot = {
  kind: PhotoKind;
  /** Есть ли место с таким id (Зал, Тренер…): его могли удалить в другой вкладке. */
  exists(id: string | undefined): Promise<boolean>;
  /** Записывает путь и возвращает прежний (или null). */
  set(id: string | undefined, path: string): Promise<string | null>;
  /** Снимает Фото с места и возвращает прежний путь (или null). */
  clear(id: string | undefined): Promise<string | null>;
  /** Все пути, на которые ссылается владелец, — для уборки брошенных файлов. */
  paths(): Promise<(string | null | undefined)[]>;
};
export type PhotoSlots = readonly PhotoSlot[];

const slotFor = (target: PhotoTarget, slots: PhotoSlots) => slots.find((s) => s.kind === target.kind) ?? null;
const targetId = (target: PhotoTarget) => ("id" in target ? target.id : undefined);
/** Места, которые ведут модули-владельцы: без переданного места такая загрузка не принимается. Своё у Фото — только Галерея. */
const OWNED_KINDS: readonly PhotoKind[] = PHOTO_KINDS.filter((k) => k !== "gallery");

/** Есть ли место, к которому привязывается Фото: Тренер мог быть удалён в другой вкладке. */
async function targetExists(target: PhotoTarget, slots: PhotoSlots): Promise<boolean> {
  const slot = slotFor(target, slots);
  if (slot) return slot.exists(targetId(target));
  return !OWNED_KINDS.includes(target.kind);
}

/**
 * Шаг 1 загрузки. Проверяет тип и размер файлов и лимит объёма и выдаёт адрес загрузки для каждого файла:
 * самого Фото и его уменьшенных копий (`sizes` — в порядке photoFiles: Фото, потом копии от меньшей к большей).
 * Путь и имя файла задаёт сервер.
 */
export async function requestUpload(
  targetRaw: string,
  type: string,
  sizes: number[],
  slots: PhotoSlots = [],
): Promise<ServiceResult<{ path: string; uploads: { path: string; url: string }[] }>> {
  await requireOwner();
  const target = parsePhotoTarget(targetRaw);
  if (!target) return { ok: false, error: BAD_TARGET };
  if (!Array.isArray(sizes) || sizes.length !== 1 + PHOTO_VARIANTS.length) return { ok: false, error: BAD_TARGET };
  let allowed: ReturnType<typeof checkUpload> | null = null;
  for (const size of sizes) {
    allowed = checkUpload(type, size);
    if (!allowed.ok) return allowed;
  }
  if (!allowed?.ok) return { ok: false, error: BAD_TARGET };
  if (!(await targetExists(target, slots))) return { ok: false, error: NOT_FOUND_MESSAGE };

  const path = newPhotoPath(target.kind, allowed.type, crypto.randomUUID());
  const files = photoFiles(path);
  try {
    const space = await storage.checkSpace(sizes.reduce((a, b) => a + b, 0));
    if (!space.ok) return space;
    const urls = await storage.uploadUrls(files);
    return { ok: true, path, uploads: files.map((file, i) => ({ path: file, url: urls[i] })) };
  } catch (e) {
    return { ok: false, error: storageError(e) };
  }
}

/** Записывает путь в базу и возвращает путь, который был там раньше. */
async function saveToTarget(target: PhotoTarget, path: string, slots: PhotoSlots): Promise<string | null> {
  const slot = slotFor(target, slots);
  if (slot) return slot.set(targetId(target), path);
  // Остальные места ведут модули-владельцы; сюда попадаем, только если место не передали — attachPhoto это отсекает
  if (target.kind !== "gallery") throw new Error(`Место «${target.kind}» ведёт модуль-владелец: передайте его в slots`);
  // Новое фото встаёт в конец Галереи
  const last = await db.galleryPhoto.aggregate({ _max: { sortOrder: true } });
  await db.galleryPhoto.create({ data: { path, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  return null;
}

/**
 * Шаг 2 загрузки. Привязывает загруженный файл к месту на сайте.
 * Прежний файл этого места удаляется из хранилища. Если запись в базу не удалась — удаляется новый файл.
 */
export async function attachPhoto(targetRaw: string, path: string, slots: PhotoSlots = []): Promise<ServiceResult<object>> {
  await requireOwner();
  const target = parsePhotoTarget(targetRaw);
  if (!target) return { ok: false, error: BAD_TARGET };
  // Путь приходит из браузера: принимаем только наш формат и только из папки этого места
  if (!pathMatchesKind(path, target.kind)) return { ok: false, error: BAD_TARGET };
  if (OWNED_KINDS.includes(target.kind) && !slotFor(target, slots)) return { ok: false, error: BAD_TARGET };
  // Место владельца: id из браузера проверяет сам владелец (у Зала — ещё и по списку Залов)
  const slot = slotFor(target, slots);
  if (slot && !(await slot.exists(targetId(target)))) {
    // Место удалили, пока шла загрузка (Тренера — в другой вкладке): файл без записи в базе не оставляем
    await removeQuietly([path]);
    return { ok: false, error: NOT_FOUND_MESSAGE };
  }

  try {
    if (!(await storage.photoUploaded(path))) {
      return { ok: false, error: "Фото не загрузилось. Попробуйте ещё раз." };
    }
  } catch (e) {
    return { ok: false, error: storageError(e) };
  }

  let previous: string | null;
  try {
    previous = await saveToTarget(target, path, slots);
  } catch (e) {
    await removeQuietly([path]);
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  if (previous !== path) await removeQuietly([previous]);
  await sweepOrphans(slots);
  return { ok: true };
}

/** Загрузка сорвалась на стороне браузера: убираем файл, если он успел появиться и ни к чему не привязан. */
export async function discardUpload(path: string, slots: PhotoSlots = []): Promise<void> {
  await requireOwner();
  if (!isPhotoPath(path)) return;
  if ((await referencedPaths(slots)).has(path)) return;
  await removeQuietly([path]);
}

/** Убирает Фото с места (кроме Галереи): на сайте снова покажется картинка из public/. Файл удаляется из хранилища. */
export async function removePhoto(targetRaw: string, slots: PhotoSlots = []): Promise<ServiceResult<object>> {
  await requireOwner();
  const target = parsePhotoTarget(targetRaw);
  if (!target || target.kind === "gallery") return { ok: false, error: BAD_TARGET };
  const slot = slotFor(target, slots);
  if (!slot) return { ok: false, error: BAD_TARGET };

  let previous: string | null = null;
  try {
    if (!(await slot.exists(targetId(target)))) return { ok: false, error: NOT_FOUND_MESSAGE };
    previous = await slot.clear(targetId(target));
  } catch (e) {
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  await removeQuietly([previous]);
  return { ok: true };
}

// ——— Галерея ———

const galleryOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Видимые фото Галереи для публичного сайта — без проверки сессии; файлы без ссылки пропускаем. */
export async function listVisibleGallery(): Promise<{ id: string; url: string; captionRu: string | null; captionKk: string | null }[]> {
  const photos = await db.galleryPhoto.findMany({ where: { isVisible: true }, orderBy: galleryOrder });
  return photos.flatMap((g) => {
    const url = storage.mediaUrl(g.path);
    return url ? [{ id: g.id, url, captionRu: g.captionRu, captionKk: g.captionKk }] : [];
  });
}

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
  const photos = await db.galleryPhoto.findMany({ orderBy: galleryOrder, select: { id: true, sortOrder: true } });
  const from = photos.findIndex((p) => p.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= photos.length) return;
  [photos[from], photos[to]] = [photos[to], photos[from]];
  // Пишем только те строки, у которых место изменилось: обычно это две
  const changed = photos.flatMap((p, i) => (p.sortOrder === i ? [] : [{ id: p.id, sortOrder: i }]));
  await db.$transaction(changed.map((p) => db.galleryPhoto.update({ where: { id: p.id }, data: { sortOrder: p.sortOrder } })));
}

/** Удаляет фото Галереи: запись — из базы, файл — из хранилища. */
export async function deleteGalleryPhoto(id: string): Promise<void> {
  await requireOwner();
  const photo = id ? await db.galleryPhoto.findUnique({ where: { id } }) : null;
  if (!photo) return;
  await db.galleryPhoto.deleteMany({ where: { id } });
  await removeQuietly([photo.path]);
}

// ——— Уборка ———

/**
 * Все пути к Фото, на которые ссылается база: Галерея и места владельцев.
 * Если место владельца не передали, его файлы считались бы брошенными — поэтому без всех мест уборка не идёт.
 */
async function referencedPaths(slots: PhotoSlots): Promise<Set<string>> {
  const [gallery, owned] = await Promise.all([
    db.galleryPhoto.findMany({ select: { path: true } }),
    Promise.all(slots.map((s) => s.paths())),
  ]);
  const all = [...gallery.map((g) => g.path), ...owned.flat()];
  return new Set(all.filter((p): p is string => Boolean(p)));
}

/** Переданы ли места всех владельцев: иначе уборка приняла бы их файлы за брошенные и удалила. */
const allOwnedSlots = (slots: PhotoSlots) => OWNED_KINDS.every((k) => slots.some((s) => s.kind === k));

/**
 * Уборка: удаляет из хранилища файлы старше часа, на которые не ссылается база, —
 * загрузки, брошенные на полпути (закрыли вкладку, пропала связь). Запускается после каждой успешной загрузки.
 * Ошибка уборки основному действию не мешает.
 */
export async function sweepOrphans(slots: PhotoSlots = []): Promise<number> {
  await requireOwner();
  if (!allOwnedSlots(slots)) {
    logError("Хранилище фото: уборка пропущена — переданы не все места для Фото (slots).", new Error(OWNED_KINDS.join(", ")));
    return 0;
  }
  try {
    const orphans = findOrphans(await storage.listObjects(), await referencedPaths(slots), new Date());
    await storage.removeObjects(orphans);
    return orphans.length;
  } catch (e) {
    logError("Хранилище фото: уборка не удалась.", e);
    return 0;
  }
}
