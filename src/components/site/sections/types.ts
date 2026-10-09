import type { Dictionary } from "@/dictionaries/ru";
import type { Locale } from "@/lib/i18n";
import type { SiteContent } from "@/lib/domain/site-settings";

/**
 * Что получает каждая секция главной: язык страницы, словарь (подписи из кода) и Настройки сайта
 * на языке страницы (то, что меняет Владелец). Вёрстка — по макету Stitch; тексты и данные — наши.
 */
export type SectionProps = { locale: Locale; t: Dictionary; s: SiteContent };
