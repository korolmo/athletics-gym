import "server-only";
import { db } from "@/lib/db";
import { SETTINGS_ID } from "@/modules/site";
import { mediaUrl } from "@/modules/photos";

// Данные публичного сайта: только то, что Владелец оставил видимым. Без проверки сессии.

const tariffsByOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

/** Позиции прайса Залов и Тренеры с их персональными Тарифами. */
export async function getPriceListAndTrainers() {
  const [hallTariffs, trainers] = await Promise.all([
    // Тарифы Тренеров приходят вместе с Тренерами
    db.tariff.findMany({ where: { isVisible: true, trainerId: null }, orderBy: tariffsByOrder }),
    db.trainer.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { tariffs: { where: { isVisible: true }, orderBy: tariffsByOrder } },
    }),
  ]);
  return { hallTariffs, trainers };
}

/**
 * Фото, загруженные Владельцем, — готовыми ссылками. Пусто (null) значит «не загружено»:
 * секция показывает картинку из public/, как до этапа 2.
 */
export async function getSitePhotos() {
  const [settings, halls, gallery] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { heroPhoto: true, womenPhoto: true } }),
    db.hall.findMany({ select: { id: true, pricePoster: true } }),
    db.galleryPhoto.findMany({ where: { isVisible: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return {
    hero: mediaUrl(settings?.heroPhoto),
    women: mediaUrl(settings?.womenPhoto),
    posters: Object.fromEntries(halls.map((h) => [h.id, mediaUrl(h.pricePoster)])) as Record<string, string | null>,
    gallery: gallery.flatMap((g) => {
      const url = mediaUrl(g.path);
      return url ? [{ id: g.id, url, captionRu: g.captionRu, captionKk: g.captionKk }] : [];
    }),
  };
}
