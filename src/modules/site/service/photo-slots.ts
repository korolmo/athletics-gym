import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { requireOwner } from "@/modules/owner";
import { mediaUrl, type PhotoSlot } from "@/modules/photos";

// Фото первого экрана и Женского зала — места для Фото, которые ведёт модуль Сайт (этап 6, ADR 0015,
// «Места для Фото»). Пути хранятся в Настройках сайта (heroPhoto, womenPhoto); файлы ведёт модуль Фото.
// У этих мест нет id: Настройки одни на Клуб.

type Column = "heroPhoto" | "womenPhoto";

function settingsPhotoSlot(clubId: string, kind: "hero" | "women", column: Column): PhotoSlot {
  const db = dbFor(clubId);
  const read = async () =>
    ((await db.siteSettings.findUnique({ where: { clubId }, select: { [column]: true } })) as Record<Column, string | null> | null)?.[column] ??
    null;
  return {
    kind,
    async exists(id) {
      return id === undefined;
    },
    async set(_id, path) {
      const previous = await read();
      await db.siteSettings.update({ where: { clubId }, data: { [column]: path } });
      return previous;
    },
    async clear() {
      const previous = await read();
      if (previous) await db.siteSettings.update({ where: { clubId }, data: { [column]: null } });
      return previous;
    },
    async paths() {
      return [await read()];
    },
  };
}

export const heroPhotoSlot = (clubId: string) => settingsPhotoSlot(clubId, "hero", "heroPhoto");
export const womenPhotoSlot = (clubId: string) => settingsPhotoSlot(clubId, "women", "womenPhoto");

/** Фото первого экрана и Женского зала — ссылками, для раздела «Фото» в админке. */
export async function getSettingsPhotos(clubId: string): Promise<{ hero: string | null; women: string | null }> {
  await requireOwner();
  const s = await dbFor(clubId).siteSettings.findUnique({ where: { clubId }, select: { heroPhoto: true, womenPhoto: true } });
  return { hero: mediaUrl(s?.heroPhoto), women: mediaUrl(s?.womenPhoto) };
}
