// Правило лимита попыток входа — чистая функция, без базы и запроса

/** Не больше 5 неудачных попыток входа с одного IP за 15 минут. */
export const MAX_FAILED_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;
/** Пауза после неудачной попытки — замедляет перебор даже в пределах лимита. */
export const FAILURE_DELAY_MS = 800;
export type LimitState = { blocked: false } | { blocked: true; retryAfterMin: number };

/** Чистое правило лимита: по времени неудачных попыток в окне решает, пускать ли дальше. */
export function evaluateAttempts(failedAt: Date[], now: Date): LimitState {
  const inWindow = failedAt.filter((d) => now.getTime() - d.getTime() < WINDOW_MS);
  if (inWindow.length < MAX_FAILED_ATTEMPTS) return { blocked: false };
  // Блокировка снимется, когда самая старая из последних MAX попыток выйдет из окна
  const sorted = inWindow.map((d) => d.getTime()).sort((a, b) => b - a);
  const releaseAt = sorted[MAX_FAILED_ATTEMPTS - 1] + WINDOW_MS;
  return { blocked: true, retryAfterMin: Math.max(1, Math.ceil((releaseAt - now.getTime()) / 60_000)) };
}
