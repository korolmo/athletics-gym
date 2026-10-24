import type { Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";

const COOKIE_RE = new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=(ru|kk)(?:;|$)`);

/**
 * Язык страницы 404 (app/global-not-found.tsx). Она статическая и одна на все адреса, поэтому язык выбирает браузер:
 * по адресу (/kk/…), а у адреса без языка — по cookie языка; иначе русский.
 */
export function notFoundLocale(pathname: string, cookie: string): Locale {
  const first = pathname.split("/")[1];
  if (first === "ru" || first === "kk") return first;
  return (cookie.match(COOKIE_RE)?.[1] as Locale | undefined) ?? "ru";
}
