import type { Dictionary } from "@/dictionaries/ru";
import type { Locale } from "@/lib/i18n";

/** Что получает каждая секция главной: язык страницы и словарь. Вёрстка — по макету Stitch; тексты и данные — наши. */
export type SectionProps = { locale: Locale; t: Dictionary };
