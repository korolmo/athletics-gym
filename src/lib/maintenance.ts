// Технические работы (страница 503): Владелец или разработчик включает их переменной MAINTENANCE_MODE=1
// (Plesk → Node.js → переменные, затем перезапуск) — например, на время восстановления базы из копии.
// Тогда middleware сам отдаёт на любой странице сайта готовую двуязычную страницу (src/lib/errors/offline-page.ts)
// с кодом 503 и Retry-After: без переписывания адреса — иначе Vercel подменил бы её своей страницей (ADR 0013).
// Админка, API и Фото работают как обычно. Когда приложение не запущено совсем, 503 отдаёт веб-сервер —
// статическая страница public/errors/503.html того же вида.

/** Через сколько секунд поисковикам и браузерам стоит спросить снова. */
export const MAINTENANCE_RETRY_AFTER_SEC = 600;

export function isMaintenance(env: Record<string, string | undefined> = process.env): boolean {
  return env.MAINTENANCE_MODE?.trim() === "1";
}
