import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import { moveInOrder } from "@/lib/domain/direction";
import { isPhotoPath } from "@/lib/domain/photo";
import { mediaUrl, removeObjects } from "@/lib/storage/client";
import type { DirectionInput } from "@/lib/validation/direction";
import type { ServiceResult } from "./result";

// Направления. Сайт читает только не скрытые; всё остальное — админка, каждая функция сама проверяет сессию Владельца.
// Фото Направления загружается общим механизмом этапа 2 (services/photos.ts, место «direction:<id>»).

const byOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Направления для сайта: только не скрытые, в порядке, который задал Владелец. */
export async function listVisibleDirections() {
  return db.direction.findMany({ where: { isVisible: true }, orderBy: byOrder });
}

/** Все Направления, включая скрытые, со ссылкой на Фото — для раздела админки. */
export async function listDirections() {
  await requireOwner();
  const rows = await db.direction.findMany({ orderBy: byOrder });
  return rows.map((r) => ({ ...r, photoUrl: mediaUrl(r.photo) }));
}

export async function getDirection(id: string) {
  await requireOwner();
  const row = await db.direction.findUnique({ where: { id } });
  return row ? { ...row, photoUrl: mediaUrl(row.photo) } : null;
}

/** Создаёт или правит Направление. Новое встаёт в конец списка. Фото этой формой не меняется. */
export async function saveDirection(input: DirectionInput): Promise<ServiceResult<{ id: string }>> {
  await requireOwner();
  const { id, ...data } = input;
  if (!id) {
    const last = await db.direction.aggregate({ _max: { sortOrder: true } });
    const created = await db.direction.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    return { ok: true, id: created.id };
  }
  try {
    await db.direction.update({ where: { id }, data });
  } catch (e) {
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  return { ok: true, id };
}

export async function toggleDirection(id: string): Promise<void> {
  await requireOwner();
  const row = await db.direction.findUnique({ where: { id } });
  if (row) await db.direction.updateMany({ where: { id }, data: { isVisible: !row.isVisible } });
}

/** Сдвигает Направление на одно место; пишутся только строки, у которых место изменилось. */
export async function moveDirection(id: string, direction: "up" | "down"): Promise<void> {
  await requireOwner();
  const rows = await db.direction.findMany({ orderBy: byOrder, select: { id: true, sortOrder: true } });
  const next = moveInOrder(rows.map((r) => r.id), id, direction);
  if (!next) return;
  const current = new Map(rows.map((r) => [r.id, r.sortOrder]));
  const changed = next.flatMap((rowId, i) => (current.get(rowId) === i ? [] : [{ id: rowId, sortOrder: i }]));
  await db.$transaction(changed.map((r) => db.direction.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
}

/** Удаляет Направление; его Фото удаляется и из хранилища (не вышло — файл подберёт уборка). */
export async function deleteDirection(id: string): Promise<void> {
  await requireOwner();
  const row = id ? await db.direction.findUnique({ where: { id } }) : null;
  if (!row) return;
  await db.direction.deleteMany({ where: { id } });
  if (row.photo && isPhotoPath(row.photo)) {
    await removeObjects([row.photo]).catch((e) => console.error("Хранилище фото: Фото удалённого Направления осталось.", e));
  }
}
