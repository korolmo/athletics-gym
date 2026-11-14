// Тревоги выгорания бюджета «сейчас» (этап 5, ADR 0028): чистые функции без сети и базы. Их берут попутная проверка
// Лаборатории (src/app/burn-kick.ts) и тесты. Суточный отчёт (report.mjs) по-прежнему ищет худшее окно за сутки —
// здесь же только окна, заканчивающиеся в момент проверки: тревога должна прийти, пока выгорание идёт.
import { ALERTS, BUDGET, CHECKS_PER_HOUR, MIN_WINDOW_SHARE, SLO_TARGETS, isGood } from "./sli.mjs";

const HOUR = 3_600_000;

/** Повтор тревоги выгорания — не чаще раза в час; «мониторинг слеп» — раз в 6 часов (решения 3 и 11). */
export const ALERT_REPEAT_MS = HOUR;
export const BLIND_REPEAT_MS = 6 * HOUR;
/** «Восстановлено» шлём, если тревога этого вида была не раньше, чем столько назад. */
export const RECOVERY_LOOKBACK_MS = 7 * HOUR;
/** Попутная проверка на экземпляр — не чаще раза в 15 минут. */
export const BURN_CHECK_GAP_MS = 15 * 60_000;
/** Проверки нужны за самое длинное окно тревоги (6 ч) с запасом на задержку данных UptimeRobot. */
export const FETCH_LOOKBACK_MS = 7 * HOUR;

/**
 * Burn rate окна длины windowMs, заканчивающегося в `now`: доля неуспешных проверок страниц SLO / бюджет.
 * Проверок меньше 75 % ожидаемых — null (на дырявых данных burn — шум, ADR 0014).
 * @param {{ t: string, target: string, status: number, ms: number | null }[]} checks
 */
export function currentBurn(checks, windowMs, now) {
  let total = 0;
  let bad = 0;
  for (const c of checks) {
    if (!SLO_TARGETS.includes(c.target)) continue;
    const ts = Date.parse(c.t);
    if (ts <= now - windowMs || ts > now) continue;
    total++;
    if (!isGood(c)) bad++;
  }
  const expected = (windowMs / HOUR) * CHECKS_PER_HOUR * SLO_TARGETS.length;
  if (total < expected * MIN_WINDOW_SHARE) return null;
  return bad / total / BUDGET;
}

/**
 * Что сейчас горит: burn за 1 ч и 6 ч, сработавшие тревоги (пороги ADR 0014) и «слепота» — когда ни одно окно
 * не набрало данных. `apiFailed` — проверки не получены вовсе (API UptimeRobot не ответил).
 * @returns {{ burns: Record<string, number | null>, firing: string[], blind: boolean }}
 */
export function evaluateBurn(checks, now, apiFailed = false) {
  const burns = {};
  const firing = [];
  for (const a of ALERTS) {
    const b = apiFailed ? null : currentBurn(checks, a.windowMs, now);
    burns[a.name] = b;
    if (b !== null && b >= a.burn) firing.push(a.name);
  }
  const blind = apiFailed || ALERTS.every((a) => burns[a.name] === null);
  return { burns, firing, blind };
}

/** Порог тревоги по имени (fastBurn → 14,4) — для текста сообщения. */
export function alertThreshold(name) {
  return ALERTS.find((a) => a.name === name)?.burn ?? null;
}
