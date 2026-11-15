import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { mediaUrl } from "@/modules/photos";

/** Фото первого экрана и Женского зала для публичного сайта — ссылками, без проверки сессии; null — не загружено. */
export async function getSettingsPhotoUrls(clubId: string): Promise<{ hero: string | null; women: string | null }> {
  const s = await dbFor(clubId).siteSettings.findUnique({ where: { clubId }, select: { heroPhoto: true, womenPhoto: true } });
  return { hero: mediaUrl(s?.heroPhoto), women: mediaUrl(s?.womenPhoto) };
}
