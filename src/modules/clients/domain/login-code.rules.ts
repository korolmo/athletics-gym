// Правила входа Клиента по одноразовому коду (ADR 0016) — чистые функции и константы, без базы.

/** Код — 6 цифр, живёт 5 минут; после 5 неверных вводов он сгорает. */
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

/** Запросить код на один номер — не чаще 3 раз за 15 минут. */
export const MAX_CODES_PER_PHONE = 3;
export const PHONE_WINDOW_MS = 15 * 60 * 1000;

/** С одного адреса — не больше 10 кодов за час (на разные номера). */
export const MAX_CODES_PER_IP = 10;
export const IP_WINDOW_MS = 60 * 60 * 1000;

/** Записи о кодах старше суток не нужны — чистятся при каждом следующем запросе. Срок назван в Политике конфиденциальности. */
export const CODE_KEEP_MS = 24 * 60 * 60 * 1000;

export type RequestLimit = { blocked: false } | { blocked: true; retryAfterMin: number };

/**
 * Чистое правило лимита: по времени прежних запросов в окне решает, выдавать ли новый код.
 * Блокировка снимется, когда самый старый из последних `max` запросов выйдет из окна.
 */
export function evaluateRequests(requestedAt: Date[], now: Date, max: number, windowMs: number): RequestLimit {
  const inWindow = requestedAt.map((d) => d.getTime()).filter((t) => now.getTime() - t < windowMs);
  if (inWindow.length < max) return { blocked: false };
  const sorted = inWindow.sort((a, b) => b - a);
  const releaseAt = sorted[max - 1] + windowMs;
  return { blocked: true, retryAfterMin: Math.max(1, Math.ceil((releaseAt - now.getTime()) / 60_000)) };
}

/** Строгий вид кода: ровно 6 цифр (пробелы при вводе убирает разбор формы). */
export function isCodeShape(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
}
