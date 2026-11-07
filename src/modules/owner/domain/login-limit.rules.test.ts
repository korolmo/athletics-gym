import { describe, expect, it } from "vitest";
import { MAX_FAILED_ATTEMPTS, WINDOW_MS, evaluateAttempts } from "./login-limit.rules";

const NOW = new Date("2026-10-08T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("лимит попыток входа", () => {
  it("настроен на 5 попыток за 15 минут", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it("без неудач и при 4 неудачах вход разрешён", () => {
    expect(evaluateAttempts([], NOW)).toEqual({ blocked: false });
    expect(evaluateAttempts([1, 2, 3, 4].map(minutesAgo), NOW)).toEqual({ blocked: false });
  });

  it("5 неудач в окне — блокировка до выхода самой старой из окна", () => {
    // самая старая — 10 минут назад, значит ждать ещё 5 минут
    expect(evaluateAttempts([1, 2, 3, 4, 10].map(minutesAgo), NOW)).toEqual({ blocked: true, retryAfterMin: 5 });
  });

  it("попытки старше 15 минут не считаются", () => {
    expect(evaluateAttempts([1, 2, 3, 4, 16, 20, 30].map(minutesAgo), NOW)).toEqual({ blocked: false });
  });

  it("при большем числе неудач ждать нужно, пока в окне не останется меньше 5", () => {
    // 7 неудач: блокировка снимется, когда из окна выйдет 5-я с конца (3 минуты назад) → ещё 12 минут
    expect(evaluateAttempts([1, 1, 2, 2, 3, 9, 14].map(minutesAgo), NOW)).toEqual({ blocked: true, retryAfterMin: 12 });
  });

  it("минимальное ожидание — 1 минута", () => {
    const almost = new Date(NOW.getTime() - WINDOW_MS + 5_000);
    expect(evaluateAttempts([almost, almost, almost, almost, almost], NOW)).toEqual({ blocked: true, retryAfterMin: 1 });
  });
});
