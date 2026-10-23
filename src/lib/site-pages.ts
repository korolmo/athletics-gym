// Страницы сайта внутри языка (/ru, /ru/privacy …) — для middleware: всё остальное под /ru и /kk он отдаёт
// страницей 404 (маршрут [locale]/[...rest]) с кодом 404.
// Почему не notFound(): у проекта два корневых layout (сайт и админка) без общего, и Next 15 тогда рисует 404
// на сервере пустой оболочкой (<html id="__next_error__">), а текст страницы — уже скриптом в браузере.
// Новая страница в src/app/[locale] — добавить сюда; расхождение ловит тест site-pages.test.ts.

export const SITE_PAGES = ["", "/privacy", "/terms", "/maintenance", "/opengraph-image", "/twitter-image"] as const;

/** Путь внутри языка («/privacy», «» для главной) — своя страница сайта или нет. */
export function isSitePage(pathInLocale: string): boolean {
  const path = pathInLocale.replace(/\/+$/, "");
  return (SITE_PAGES as readonly string[]).includes(path);
}
