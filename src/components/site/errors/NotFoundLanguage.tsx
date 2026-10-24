"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { notFoundLocale } from "@/lib/errors/not-found-locale";

/**
 * Обе версии страницы 404 уже в HTML: сервер отдаёт одну статическую страницу на все адреса, и язык выбирает браузер
 * (по адресу или cookie). До выбора и без скриптов видна русская. Маркер data-error-page — для смоука после выкатки.
 */
export function NotFoundLanguage({ ru, kk, titles }: { ru: React.ReactNode; kk: React.ReactNode; titles: Record<Locale, string> }) {
  const [locale, setLocale] = useState<Locale>("ru");

  useEffect(() => {
    const chosen = notFoundLocale(window.location.pathname, document.cookie);
    setLocale(chosen);
    document.documentElement.lang = chosen;
    document.title = titles[chosen];
  }, [titles]);

  return (
    <>
      <div data-error-page="404" lang="ru" hidden={locale !== "ru"}>
        {ru}
      </div>
      <div data-error-page="404" lang="kk" hidden={locale !== "kk"}>
        {kk}
      </div>
    </>
  );
}
