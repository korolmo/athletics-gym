import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/modules/owner";
import { mediaUrl, type PhotoSlot } from "@/modules/photos";
import { SETTINGS_ID } from "./settings";

// Фото первого экрана и Женского зала — места для Фото, которые ведёт модуль Сайт (этап 6, ADR 0015,
// «Места для Фото»). Пути хранятся в Настройках сайта (heroPhoto, womenPhoto); файлы ведёт модуль Фото.
// У этих мест нет id: Настройки одни на сайт.

type Column = "heroPhoto" | "womenPhoto";

function settingsPhotoSlot(kind: "hero" | "women", column: Column): PhotoSlot {
  const read = async () =>
    ((await db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { [column]: true } })) as Record<Column, string | null> | null)?.[column] ??
    null;
  return {
    kind,
    async exists(id) {
      return id === undefined;
    },
    async set(_id, path) {
      const previous = await read();
      await db.siteSettings.update({ where: { id: SETTINGS_ID }, data: { [column]: path } });
      return previous;
    },
    async clear() {
      const previous = await read();
      if (previous) await db.siteSettings.update({ where: { id: SETTINGS_ID }, data: { [column]: null } });
      return previous;
    },
    async paths() {
      return [await read()];
    },
  };
}

export const heroPhotoSlot = settingsPhotoSlot("hero", "heroPhoto");
export const womenPhotoSlot = settingsPhotoSlot("women", "womenPhoto");

/** Фото первого экрана и Женского зала — ссылками, для раздела «Фото» в админке. */
export async function getSettingsPhotos(): Promise<{ hero: string | null; women: string | null }> {
  await requireOwner();
  const s = await db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { heroPhoto: true, womenPhoto: true } });
  return { hero: mediaUrl(s?.heroPhoto), women: mediaUrl(s?.womenPhoto) };
}
