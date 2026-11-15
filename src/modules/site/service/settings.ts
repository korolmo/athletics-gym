import "server-only";
import { CLUB_ID } from "@/modules/club/client";
import { dbFor } from "@/lib/tenant-db";
import { ABOUT_CARD_COUNT, settingsFromRow, type AboutCardData, type SiteSettingsData } from "../domain/site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "../domain/site-settings.defaults";

/**
 * Запись Настроек сайта одна на Клуб (этап П2): ищем её по Клубу. Ключ строки — «site» у Клуба по умолчанию
 * (как до П2), у остальных — «site-<id Клуба>».
 */
export const settingsRowId = (clubId: string) => (clubId === CLUB_ID ? "site" : `site-${clubId}`);

/**
 * Настройки сайта и карточки «О зале» — для публичного сайта, без проверки сессии. Записи в базе заводит миграция;
 * если их вдруг нет (например, пустая база до seed) — показываем начальные значения, а не пустую страницу.
 */
export async function getSiteSettings(clubId: string): Promise<{ settings: SiteSettingsData; cards: AboutCardData[] }> {
  const [settings, cards] = await Promise.all([
    dbFor(clubId).siteSettings.findUnique({ where: { clubId } }),
    dbFor(clubId).aboutCard.findMany({ orderBy: { position: "asc" } }),
  ]);
  return {
    settings: settings ? settingsFromRow(settings) : DEFAULT_SETTINGS,
    cards: cards.length === ABOUT_CARD_COUNT ? cards : DEFAULT_ABOUT_CARDS,
  };
}
