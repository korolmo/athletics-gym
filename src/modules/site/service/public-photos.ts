import "server-only";
import { db } from "@/lib/db";
import { mediaUrl } from "@/modules/photos";
import { SETTINGS_ID } from "./settings";

/** Фото первого экрана и Женского зала для публичного сайта — ссылками, без проверки сессии; null — не загружено. */
export async function getSettingsPhotoUrls(): Promise<{ hero: string | null; women: string | null }> {
  const s = await db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { heroPhoto: true, womenPhoto: true } });
  return { hero: mediaUrl(s?.heroPhoto), women: mediaUrl(s?.womenPhoto) };
}
