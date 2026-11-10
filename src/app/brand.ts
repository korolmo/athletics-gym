import "server-only";
import { cache } from "react";
import { getCabinetDictionary, getDictionary, type Locale } from "@/lib/i18n";
import { fillBrand } from "@/lib/brand-text";
import { getClub } from "@/modules/club";
import { clubTextVars, type ClubData } from "@/modules/club/client";

// Бренд в текстах (этап П1, ADR 0018): словари хранят метки {club}, {city}…, значения — из Клуба. Платформа (src/lib)
// модули не импортирует, поэтому Клуб со словарём сводит слой приложения. Страницы без базы (ошибки) — brand-static.ts.

/** Клуб — один запрос на запрос страницы, сколько бы раз его ни спросили. */
export const getClubOnce = cache(getClub);

export function brandVarsFor(club: ClubData, locale: Locale) {
  return clubTextVars(club, locale, getDictionary(locale).brand.since);
}

/** Словарь сайта с названием, городом и ссылками Клуба. */
export async function getSiteDictionary(locale: Locale) {
  return fillBrand(getDictionary(locale), brandVarsFor(await getClubOnce(), locale));
}

/** Словарь кабинета с названием Клуба. */
export async function getCabinetTexts(locale: Locale) {
  const [t, club] = await Promise.all([getCabinetDictionary(locale), getClubOnce()]);
  return fillBrand(t, brandVarsFor(club, locale));
}
