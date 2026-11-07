import "server-only";
import { db } from "@/lib/db";
import type { PhotoSlot } from "@/modules/photos";

// Плакат Тренера — место для Фото, которое ведёт модуль Тренеры (этап 6, ADR 0015, «Места для Фото»).
// Путь хранится у Тренера (Trainer.uploadedPhoto); файл, хранилище и уборку ведёт модуль Фото.

const ID = /^[a-z0-9_]{1,40}$/i;

export const trainerPosterSlot: PhotoSlot = {
  kind: "trainer",
  async exists(id) {
    return Boolean(id && ID.test(id)) && (await db.trainer.count({ where: { id } })) > 0;
  },
  async set(id, path) {
    const before = await db.trainer.findUnique({ where: { id }, select: { uploadedPhoto: true } });
    await db.trainer.update({ where: { id }, data: { uploadedPhoto: path } });
    return before?.uploadedPhoto ?? null;
  },
  async clear(id) {
    const previous = (await db.trainer.findUnique({ where: { id }, select: { uploadedPhoto: true } }))?.uploadedPhoto ?? null;
    if (previous) await db.trainer.update({ where: { id }, data: { uploadedPhoto: null } });
    return previous;
  },
  async paths() {
    return (await db.trainer.findMany({ where: { uploadedPhoto: { not: null } }, select: { uploadedPhoto: true } })).map((t) => t.uploadedPhoto);
  },
};
