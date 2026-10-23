"use client";

import { OFFLINE_CSS, offlineBody } from "@/lib/errors/offline-page";

// Последняя линия: упал корневой layout сайта или админки, и обычные страницы ошибок не отрисовать.
// Та же страница, что отдаёт веб-сервер при остановленном приложении (на двух языках), только с кодом 500.

export default function GlobalError() {
  return (
    <html lang="ru">
      <head>
        <title>Athletic&apos;s Gym</title>
        <meta name="robots" content="noindex" />
        <style>{OFFLINE_CSS}</style>
      </head>
      <body dangerouslySetInnerHTML={{ __html: offlineBody(500) }} />
    </html>
  );
}
