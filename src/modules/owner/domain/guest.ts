// Гость демо-админки (этап П1, решения 6–9, ADR 0019): вход без аккаунта, только в Лаборатории. Чистый код.

/**
 * Включён ли гостевой вход: только Лаборатория (APP_ENV=lab) и только с GUEST_DEMO=1. На боевом сайте
 * (APP_ENV=production) и локально его нет при любом GUEST_DEMO — это проверяет тест.
 */
export function guestLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.APP_ENV?.trim() === "lab" && env.GUEST_DEMO?.trim() === "1";
}

/** Подпись у закрытого Гостю действия. */
export const GUEST_LOCKED = "В демо недоступно";
