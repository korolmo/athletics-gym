import type { Dictionary } from "@/dictionaries/ru";
import type { Locale } from "@/lib/i18n";
import type { SiteContent } from "@/modules/site/client";
import type { LogoView } from "@/modules/club/client";

/**
 * Что получает каждая секция главной: язык страницы, словарь (подписи из кода) и Настройки сайта
 * на языке страницы (то, что меняет Владелец). Вёрстка — по макету Stitch; тексты и данные — наши.
 */
/** `logos` — логотипы Клуба и Женского зала (этап П1): картинка или монограмма. */
export type SectionProps = { locale: Locale; t: Dictionary; s: SiteContent; logos: { club: LogoView; women: LogoView } };
