import "server-only";
import { cache } from "react";
import { getCabinetDictionary, getDictionary, type Locale } from "@/lib/i18n";
import { fillBrand } from "@/lib/brand-text";
import { getClub } from "@/modules/club";
import { DEFAULT_CLUB, accentCssVars, accentPalette, clubTextVars, logoSource, monogramSvg, monogramText, svgDataUrl, type ClubData, type LogoView } from "@/modules/club/client";
import { mediaUrl } from "@/modules/photos";
import { listHallLogos } from "@/modules/tariffs";
import { siteIcons } from "@/lib/brand";
import type { CSSProperties } from "react";

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

/**
 * Цвет акцента Клуба — CSS-переменные для `style` корневого <html> (сайт, кабинет, админка). Начальный цвет —
 * пусто, работают токены globals.css. База недоступна — тоже начальный: страница не должна падать из-за цвета.
 */
export async function accentStyle(): Promise<CSSProperties | undefined> {
  const club = await getClubOnce().catch(() => DEFAULT_CLUB);
  const vars = accentCssVars(club.accentColor, DEFAULT_CLUB.accentColor);
  return Object.keys(vars).length ? (vars as CSSProperties) : undefined;
}

/** Логотипы и иконки для страниц (этап П1, решения 12 и 16). */
export type SiteLogos = {
  /** Логотип Клуба: шапка, подвал, карта, кабинет, админка */
  club: LogoView;
  /** Логотип Женского зала: свой у Зала или логотип Клуба */
  women: LogoView;
  /** Иконки вкладки и рабочего стола */
  icons: { small: string; large: string; apple: string };
  /** Адрес логотипа для разметки поисковиков (путь от корня сайта); монограмма — null */
  jsonLdPath: string | null;
};

function monogramOf(club: ClubData): Extract<LogoView, { kind: "monogram" }> {
  const p = accentPalette(club.accentColor);
  const d = accentPalette(DEFAULT_CLUB.accentColor);
  const palette = p.ok ? p.palette : d.ok ? d.palette : { accent: "#f5e642", ink: "#363100" };
  return { kind: "monogram", text: monogramText(club.name), bg: palette.accent, fg: palette.ink };
}

/** Логотип по полю: файл, Фото (адрес /media/…) или монограмма Клуба. Фото без файла — монограмма. */
export function logoView(value: string | null, club: ClubData): LogoView {
  const src = logoSource(value);
  if (src.kind === "file") return { kind: "image", src: src.src };
  if (src.kind === "photo") {
    const url = mediaUrl(src.path);
    if (url) return { kind: "image", src: url };
  }
  return monogramOf(club);
}

export function logosFor(club: ClubData, hallLogos: Record<string, string | null> = {}): SiteLogos {
  const clubLogo = logoView(club.logo, club);
  const women = hallLogos.women ? logoView(hallLogos.women, club) : clubLogo;
  const src = logoSource(club.logo);
  // Иконки: прежний логотип — его маленькие копии из public/; Фото — само Фото; монограмма — SVG в адресе
  const icons =
    src.kind === "file" && club.logo === DEFAULT_CLUB.logo
      ? siteIcons
      : clubLogo.kind === "image"
        ? { small: clubLogo.src, large: clubLogo.src, apple: clubLogo.src }
        : (() => {
            const url = svgDataUrl(monogramSvg(clubLogo));
            return { small: url, large: url, apple: url };
          })();
  const jsonLdPath = clubLogo.kind === "image" ? clubLogo.src.split("?")[0] : null;
  return { club: clubLogo, women, icons, jsonLdPath };
}

/** Логотипы для страницы; база недоступна — начальные (страница не должна падать из-за логотипа). */
export async function getLogos(): Promise<SiteLogos> {
  const [club, halls] = await Promise.all([getClubOnce().catch(() => DEFAULT_CLUB), listHallLogos().catch(() => ({}))]);
  return logosFor(club, halls);
}
