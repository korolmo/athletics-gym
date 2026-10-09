import "server-only";
import { db } from "@/lib/db";
import { ABOUT_CARD_COUNT, type AboutCardData, type SiteSettingsData } from "@/lib/domain/site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import { mediaUrl } from "@/lib/storage/client";

/** В базе одна запись Настроек сайта. */
export const SETTINGS_ID = "site";

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
 * Настройки сайта и карточки «О зале». Записи в базе заводит миграция; если их вдруг нет
 * (например, пустая база до seed) — показываем начальные значения, а не пустую страницу.
 */
export async function getSiteSettings(): Promise<{ settings: SiteSettingsData; cards: AboutCardData[] }> {
  const [settings, cards] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: SETTINGS_ID } }),
    db.aboutCard.findMany({ orderBy: { position: "asc" } }),
  ]);
  return {
    settings: settings ?? DEFAULT_SETTINGS,
    cards: cards.length === ABOUT_CARD_COUNT ? cards : DEFAULT_ABOUT_CARDS,
  };
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
