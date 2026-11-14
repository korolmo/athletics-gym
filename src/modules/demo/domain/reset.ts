// Суточный сброс демо-админки (этап П1, решения 10–11, ADR 0019): когда пора и сколько держать блокировку. Чистый код.
import { addDays, zonedParts, zonedToUtc } from "@/lib/time";

/** Сброс — после 04:00 по времени Клуба: ночью на демо никого нет. */
export const RESET_HOUR = 4;
/** Блокировка на время сброса: второй запрос в эти минуты сброс не начнёт. */
export const RESET_LOCK_MS = 5 * 60_000;

/** Последняя граница сброса не позже `now`: сегодня в 04:00 по времени Клуба, а до 04:00 — вчера в 04:00. */
export function lastResetBoundary(now: Date, timeZone: string): Date {
  const today = zonedParts(now, timeZone).day;
  const boundary = zonedToUtc(today, RESET_HOUR * 60, timeZone);
  return boundary <= now ? boundary : zonedToUtc(addDays(today, -1), RESET_HOUR * 60, timeZone);
}

/** Пора ли сбрасывать: последнего сброса не было или он был до последней границы. */
export function resetDue(lastResetAt: Date | null, now: Date, timeZone: string): boolean {
  return lastResetAt === null || lastResetAt < lastResetBoundary(now, timeZone);
}

/** Снимок: у каждого модуля — свой кусок, модуль сам знает, что в нём. */
export type DemoSnapshot = Record<string, unknown>;
