import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { requireOwner } from "@/modules/owner";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import { moveInOrder } from "../domain/direction";
import { isPhotoPath } from "@/modules/photos";
import { mediaUrl, removeObjects } from "@/modules/photos";
import type { DirectionInput } from "../validation/direction";
import type { ServiceResult } from "@/lib/services/result";
import { logError } from "@/lib/observability/log";

// Направления. Сайт читает только не скрытые; всё остальное — админка, каждая функция сама проверяет сессию Владельца.
// Фото Направления загружается общим механизмом этапа 2 (services/photos.ts, место «direction:<id>»).

const byOrder = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Направления для сайта: только не скрытые, в порядке, который задал Владелец. */
export async function listVisibleDirections(clubId: string) {
  return dbFor(clubId).direction.findMany({ where: { isVisible: true }, orderBy: byOrder });
}

/** Все Направления, включая скрытые, со ссылкой на Фото — для раздела админки. */
export async function listDirections(clubId: string) {
  await requireOwner();
  const rows = await dbFor(clubId).direction.findMany({ orderBy: byOrder });
  return rows.map((r) => ({ ...r, photoUrl: mediaUrl(r.photo) }));
}

export async function getDirection(clubId: string, id: string) {
  await requireOwner();
  const row = await dbFor(clubId).direction.findUnique({ where: { id } });
  return row ? { ...row, photoUrl: mediaUrl(row.photo) } : null;
}

/** Создаёт или правит Направление. Новое встаёт в конец списка. Фото этой формой не меняется. */
export async function saveDirection(clubId: string, input: DirectionInput): Promise<ServiceResult<{ id: string }>> {
  await requireOwner();
  const { id, ...data } = input;
  if (!id) {
    const last = await dbFor(clubId).direction.aggregate({ _max: { sortOrder: true } });
    const created = await dbFor(clubId).direction.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    return { ok: true, id: created.id };
  }
  try {
    await dbFor(clubId).direction.update({ where: { id }, data });
  } catch (e) {
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  return { ok: true, id };
}

export async function toggleDirection(clubId: string, id: string): Promise<void> {
  await requireOwner();
  const row = await dbFor(clubId).direction.findUnique({ where: { id } });
  if (row) await dbFor(clubId).direction.updateMany({ where: { id }, data: { isVisible: !row.isVisible } });
}

/** Сдвигает Направление на одно место; пишутся только строки, у которых место изменилось. */
export async function moveDirection(clubId: string, id: string, direction: "up" | "down"): Promise<void> {
  await requireOwner();
  const rows = await dbFor(clubId).direction.findMany({ orderBy: byOrder, select: { id: true, sortOrder: true } });
  const next = moveInOrder(rows.map((r) => r.id), id, direction);
  if (!next) return;
  const current = new Map(rows.map((r) => [r.id, r.sortOrder]));
  const changed = next.flatMap((rowId, i) => (current.get(rowId) === i ? [] : [{ id: rowId, sortOrder: i }]));
  await dbFor(clubId).$transaction(changed.map((r) => dbFor(clubId).direction.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
}

/** Удаляет Направление; его Фото удаляется и из хранилища (не вышло — файл подберёт уборка). */
export async function deleteDirection(clubId: string, id: string): Promise<void> {
  await requireOwner();
  const row = id ? await dbFor(clubId).direction.findUnique({ where: { id } }) : null;
  if (!row) return;
  await dbFor(clubId).direction.deleteMany({ where: { id } });
  if (row.photo && isPhotoPath(row.photo)) {
    await removeObjects([row.photo]).catch((e) => logError("Хранилище фото: Фото удалённого Направления осталось.", e));
  }
}
