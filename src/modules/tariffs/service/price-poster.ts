import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { mediaUrl, type PhotoSlot } from "@/modules/photos";
import { HALLS, isHall, type HallId } from "../domain/tariff";

// Плакат прайса Зала — место для Фото, которое ведёт модуль Тарифы (этап 6, ADR 0015, «Места для Фото»).
// Путь хранится у Зала (Hall.pricePoster); файл, хранилище и уборку ведёт модуль Фото.

export const pricePosterSlot: PhotoSlot = {
  kind: "hall",
  async exists(id) {
    return isHall(id ?? "") && (await db.hall.count({ where: { id } })) > 0;
  },
  async set(id, path) {
    const before = await db.hall.findUnique({ where: { id }, select: { pricePoster: true } });
    await db.hall.update({ where: { id }, data: { pricePoster: path } });
    return before?.pricePoster ?? null;
  },
  async clear(id) {
    const previous = (await db.hall.findUnique({ where: { id }, select: { pricePoster: true } }))?.pricePoster ?? null;
    if (previous) await db.hall.update({ where: { id }, data: { pricePoster: null } });
    return previous;
  },
  async paths() {
    return (await db.hall.findMany({ select: { pricePoster: true } })).map((h) => h.pricePoster);
  },
};

/** Плакаты прайса по Залам — для раздела «Фото» в админке. */
export async function listPricePosters(): Promise<Record<HallId, string | null>> {
  await requireOwner();
  const halls = await db.hall.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, pricePoster: true } });
  const byId = new Map(halls.map((h) => [h.id, mediaUrl(h.pricePoster)]));
  return Object.fromEntries(HALLS.map((id) => [id, byId.get(id) ?? null])) as Record<HallId, string | null>;
}
