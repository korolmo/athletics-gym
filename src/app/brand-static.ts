import { getDictionary, type Locale } from "@/lib/i18n";
import { fillBrand } from "@/lib/brand-text";
import { DEFAULT_CLUB, clubTextVars } from "@/modules/club/client";

// Страницы без базы — 404 (собирается при сборке), 500 и 503 (ADR 0013): Клуб им не прочитать, поэтому бренд —
// начальный, как и адрес на них. В Лаборатории после правки Клуба эти страницы показывают прежнее название;
// так и задумано (решение 20 этапа П1).

export function staticBrandVars(locale: Locale) {
  return clubTextVars(DEFAULT_CLUB, locale, getDictionary(locale).brand.since);
}

/** Словарь сайта с начальным брендом — для страниц без базы. */
export function getStaticSiteDictionary(locale: Locale) {
  return fillBrand(getDictionary(locale), staticBrandVars(locale));
}

