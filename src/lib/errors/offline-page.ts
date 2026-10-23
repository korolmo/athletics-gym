// Страница «Сайт временно недоступен» на двух языках сразу — по макету Stitch «503 Статическая».
// 1) public/errors/503.html — её отдаёт веб-сервер хостинга, когда приложение не запущено (docs/hosting-plesk.md).
//    Файл собирает `npm run errors:build` из словарей; что он не устарел, проверяет тест.
// 2) app/global-error.tsx — та же страница с кодом 500, если упал сам layout сайта или админки.
// Без скриптов, шрифтов и базы: только встроенные стили и логотип из public/. Номера зала здесь нет
// (он в Настройках сайта, в базе) — контакты ведут в карточку зала в 2ГИС.

import { errorsKk } from "@/dictionaries/errors/kk";
import { errorsRu } from "@/dictionaries/errors/ru";
import { logoIconUrl } from "@/lib/brand";
import { site } from "@/lib/site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const OFFLINE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:32px 16px;background:#0e0e10;color:#e5e1e4;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.e{width:100%;max-width:400px;text-align:center}
.e-logo{display:block;width:96px;height:96px;margin:0 auto 24px;border-radius:50%;background:#1f1f21;box-shadow:0 0 0 12px rgba(245,230,66,.06)}
.e-code{font-size:32px;line-height:38px;font-weight:800;letter-spacing:.02em;color:#f5e642}
.e-bar{display:block;width:180px;height:20px;margin:4px auto 24px;color:#f5e642;opacity:.5}
.e-card{background:#1f1f23;border-radius:12px;padding:24px;text-align:left}
.e-card h1,.e-card h2{margin:0 0 4px;font-size:18px;line-height:24px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;color:#f4f4f5}
.e-card p{margin:0;font-size:14px;line-height:20px;color:#a1a1aa}
.e-hr{height:1px;margin:20px 0;background:#353437;border:0}
.e-actions{display:flex;flex-direction:column;gap:12px;margin-top:24px}
.e-btn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:8px 20px;border-radius:12px;font-size:15px;font-weight:800;line-height:20px;text-transform:uppercase;letter-spacing:.03em;text-decoration:none}
.e-btn-primary{background:#f5e642;color:#363100}
.e-btn-secondary{background:#1f1f23;color:#f4f4f5}
.e-btn:focus-visible{outline:2px solid #f5e642;outline-offset:2px}
.e-foot{margin:24px 0 0;font-size:12px;line-height:16px;color:#a1a1aa}
`;

const BAR = `<svg class="e-bar" viewBox="0 0 180 20" fill="none" aria-hidden="true"><line x1="10" y1="10" x2="170" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="35" y="4" width="6" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="43" y="2" width="6" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="131" y="2" width="6" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="139" y="4" width="6" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="90" cy="10" r="2.5" fill="currentColor"/></svg>`;

/** Содержимое <body>: код, тексты на русском и казахском, «Обновить страницу» и 2ГИС. */
export function offlineBody(code: 500 | 503): string {
  const ru = errorsRu.offline;
  const kk = errorsKk.offline;
  return [
    `<main class="e">`,
    `<img class="e-logo" src="${esc(logoIconUrl)}" alt="${esc(site.name)}" width="96" height="96">`,
    `<div class="e-code">${code}</div>`,
    BAR,
    `<div class="e-card">`,
    `<h1 lang="ru">${esc(ru.heading)}</h1><p lang="ru">${esc(ru.text)}</p>`,
    `<hr class="e-hr">`,
    `<h2 lang="kk">${esc(kk.heading)}</h2><p lang="kk">${esc(kk.text)}</p>`,
    `</div>`,
    `<div class="e-actions">`,
    // Пустой адрес — та же страница: веб-сервер отдаёт этот файл вместо запрошенной
    `<a class="e-btn e-btn-primary" href="">${esc(ru.reload)} / ${esc(kk.reload)}</a>`,
    `<a class="e-btn e-btn-secondary" href="${esc(site.twoGis)}" rel="noopener noreferrer">2ГИС</a>`,
    `</div>`,
    `<p class="e-foot">${esc(site.name)} · Кызылорда</p>`,
    `</main>`,
  ].join("\n");
}

/** Готовый файл для веб-сервера. */
export function offlinePage(): string {
  return [
    "<!doctype html>",
    `<html lang="ru">`,
    "<head>",
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="robots" content="noindex">`,
    `<title>${esc(errorsRu.offline.heading)} — ${esc(site.name)}</title>`,
    `<style>${OFFLINE_CSS.trim()}</style>`,
    "</head>",
    "<body>",
    offlineBody(503),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** Где лежит файл внутри public/ и каким адресом его называть веб-серверу. */
export const OFFLINE_FILE = "errors/503.html";
