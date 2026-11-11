"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n";
import { notFoundLocale } from "@/lib/errors/not-found-locale";

/** Адрес и cookie на странице 404 не меняются — подписка не нужна. */
const subscribeNever = () => () => {};
const browserLocale = (): Locale => notFoundLocale(window.location.pathname, document.cookie);

/**
 * Обе версии страницы 404 уже в HTML: сервер отдаёт одну статическую страницу на все адреса, и язык выбирает браузер
 * (по адресу или cookie). До выбора и без скриптов видна русская. Маркер data-error-page — для смоука после выкатки.
 */
export function NotFoundLanguage({ ru, kk, titles }: { ru: React.ReactNode; kk: React.ReactNode; titles: Record<Locale, string> }) {
  // Сервер и первая отрисовка в браузере — русская (HTML совпадает), затем язык адреса или cookie
  const locale = useSyncExternalStore(subscribeNever, browserLocale, () => "ru" as Locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <>
      {/* Заголовок вкладки — здесь, а не в metadata: тот Next после оживления страницы ставит заново, и он оставался бы русским */}
      <title>{titles[locale]}</title>
      <div data-error-page="404" lang="ru" hidden={locale !== "ru"}>
        {ru}
      </div>
      <div data-error-page="404" lang="kk" hidden={locale !== "kk"}>
        {kk}
      </div>
    </>
  );
}
