import "server-only";
import { dbFor } from "@/lib/tenant-db";
import type { PhotoSlot } from "@/modules/photos";

// Своё Фото Направления — место для Фото, которое ведёт модуль Направления (этап 6, ADR 0015, «Места для Фото»).
// Путь хранится у Направления (Direction.photo); файл, хранилище и уборку ведёт модуль Фото.

const ID = /^[a-z0-9_]{1,40}$/i;

export const directionPhotoSlot = (clubId: string): PhotoSlot => ({
  kind: "direction",
  async exists(id) {
    return Boolean(id && ID.test(id)) && (await dbFor(clubId).direction.count({ where: { id } })) > 0;
  },
  async set(id, path) {
    const previous = (await dbFor(clubId).direction.findUnique({ where: { id }, select: { photo: true } }))?.photo ?? null;
    await dbFor(clubId).direction.update({ where: { id }, data: { photo: path } });
    return previous;
  },
  async clear(id) {
    const previous = (await dbFor(clubId).direction.findUnique({ where: { id }, select: { photo: true } }))?.photo ?? null;
    if (previous) await dbFor(clubId).direction.update({ where: { id }, data: { photo: null } });
    return previous;
  },
  async paths() {
    return (await dbFor(clubId).direction.findMany({ where: { photo: { not: null } }, select: { photo: true } })).map((d) => d.photo);
  },
});
