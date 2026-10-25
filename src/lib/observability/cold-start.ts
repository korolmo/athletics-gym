// Холодный старт (ADR 0011, 0014): первый ответ экземпляра функции — X-Cold-Start: 1, все следующие — 0.
// Флаг на уровне модуля: живёт, пока жив процесс (экземпляр Vercel, процесс Passenger). Заголовок ставят маршруты,
// которые не кэшируются (health): ответ страницы из кэша CDN показал бы чужой, давно прошедший запуск.

export const COLD_START_HEADER = "X-Cold-Start";

let first = true;

/** "1" — первый вызов в этом процессе, дальше "0". */
export function takeColdStart(): "1" | "0" {
  const value = first ? "1" : "0";
  first = false;
  return value;
}

/** Заголовки ответа health-маршрута: no-store и метка холодного старта. */
export function healthHeaders(base: Record<string, string>): Record<string, string> {
  return { ...base, [COLD_START_HEADER]: takeColdStart() };
}
