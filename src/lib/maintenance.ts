// Технические работы (страница 503): Владелец или разработчик включает их переменной MAINTENANCE_MODE=1
// (Plesk → Node.js → переменные, затем перезапуск) — например, на время восстановления базы из копии.
// Тогда middleware отдаёт на любой странице сайта /<язык>/maintenance с кодом 503 и Retry-After.
// Админка, API и Фото работают как обычно. Когда приложение не запущено совсем, 503 отдаёт веб-сервер —
// статическая страница public/errors/503.html (src/lib/errors/offline-page.ts).

export const MAINTENANCE_PATH = "/maintenance";

/** Через сколько секунд поисковикам и браузерам стоит спросить снова. */
export const MAINTENANCE_RETRY_AFTER_SEC = 600;

export function isMaintenance(env: Record<string, string | undefined> = process.env): boolean {
  return env.MAINTENANCE_MODE?.trim() === "1";
}
