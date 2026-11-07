// Юридические страницы: адреса и даты редакций. Лёгкий файл без текстов — его берут и клиентские компоненты.

import type { Locale } from "@/lib/i18n";

/** Политика конфиденциальности и Пользовательское соглашение. */
export const LEGAL_PAGES = ["privacy", "terms"] as const;
export type LegalPageId = (typeof LEGAL_PAGES)[number];

/**
 * Дата редакции каждого документа — единственное место, где она задана. Меняется вместе с текстом документа.
 * Отсюда её берут страница, sitemap и Отзыв: с ним сохраняется дата редакции Политики, с которой согласился Посетитель.
 */
export const LEGAL_UPDATED: Record<LegalPageId, string> = {
  privacy: "2026-10-15",
  terms: "2026-10-12",
};

/** Раздел Политики конфиденциальности про cookie: на него ведёт «Подробнее» в плашке. */
export const COOKIES_ANCHOR = "cookies";

/** Адрес документа на языке страницы: /ru/privacy, /kk/terms#… */
export function legalPath(locale: Locale, page: LegalPageId, anchor?: string): string {
  return `/${locale}/${page}${anchor ? `#${anchor}` : ""}`;
}
