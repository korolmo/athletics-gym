import { ru, type Dictionary } from "@/dictionaries/ru";
import { kk } from "@/dictionaries/kk";

export const locales = ["ru", "kk"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return locale === "kk" ? kk : ru;
}

/** Русский обязателен, казахский необязателен: при пустом казахском показываем русский. */
export function pick(locale: Locale, ruText: string, kkText?: string | null): string {
  if (locale === "kk" && kkText && kkText.trim()) return kkText;
  return ruText;
}
