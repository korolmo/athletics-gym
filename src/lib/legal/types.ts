// Юридический документ как данные: страница только выводит их, тесты читают их как текст.

import type { Locale } from "@/lib/i18n";
import type { SiteContent } from "@/lib/domain/site-settings";

/** Кусок строки: текст или ссылка. */
export type Inline = string | { text: string; href: string; external?: boolean };

export type LegalBlock = { p: Inline[] } | { ul: Inline[][] };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

export type LegalDoc = {
  title: string;
  /** Для поисковиков */
  description: string;
  /** Дата редакции, «2026-10-11» */
  updated: string;
  intro: Inline[];
  sections: LegalSection[];
};

/** Что документ берёт из Настроек сайта и словаря. */
export type LegalContext = {
  locale: Locale;
  siteName: string;
  city: string;
  /** Реквизиты и место хранения данных */
  legal: SiteContent["legal"];
  /** Адрес и телефон зала */
  contacts: Pick<SiteContent["contacts"], "address" | "phoneTel" | "phoneDisplay">;
};

export const p = (...parts: Inline[]): LegalBlock => ({ p: parts });
export const ul = (...items: (Inline | Inline[])[]): LegalBlock => ({ ul: items.map((i) => (Array.isArray(i) ? i : [i])) });
