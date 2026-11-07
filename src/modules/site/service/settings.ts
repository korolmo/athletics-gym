import "server-only";
import { db } from "@/lib/db";
import { ABOUT_CARD_COUNT, settingsFromRow, type AboutCardData, type SiteSettingsData } from "../domain/site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "../domain/site-settings.defaults";

/** В базе одна запись Настроек сайта. */
export const SETTINGS_ID = "site";

/**
 * Настройки сайта и карточки «О зале» — для публичного сайта, без проверки сессии. Записи в базе заводит миграция;
 * если их вдруг нет (например, пустая база до seed) — показываем начальные значения, а не пустую страницу.
 */
export async function getSiteSettings(): Promise<{ settings: SiteSettingsData; cards: AboutCardData[] }> {
  const [settings, cards] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: SETTINGS_ID } }),
    db.aboutCard.findMany({ orderBy: { position: "asc" } }),
  ]);
  return {
    settings: settings ? settingsFromRow(settings) : DEFAULT_SETTINGS,
    cards: cards.length === ABOUT_CARD_COUNT ? cards : DEFAULT_ABOUT_CARDS,
  };
}
