// SLI/SLO Лаборатории (этап 0): чистые функции без зависимостей — их берут probe.mjs, report.mjs и тесты.
// SLO: 99,5 % проверок за 30 дней успешны; успех — HTTP 200 и полный ответ быстрее 1 с.
// Бюджет ошибок — 0,5 % проверок окна; burn rate — доля ошибок в окне / 0,5 % (1 — бюджет тратится ровно за 30 дней).

export const SLO = { target: 0.995, windowDays: 30, latencyMs: 1000 };
export const BUDGET = 1 - SLO.target;
export const TARGETS = ["/ru", "/kk", "/api/health/ready"];
/** Окна burn rate: быстрый (1 ч), средний (6 ч), сутки, всё окно SLO. */
export const BURN_WINDOWS = [
  { name: "1h", ms: 3_600_000 },
  { name: "6h", ms: 6 * 3_600_000 },
  { name: "24h", ms: 24 * 3_600_000 },
  { name: "30d", ms: SLO.windowDays * 24 * 3_600_000 },
];
/** Быстрое выгорание (Google SRE workbook): за час уходит 2 % месячного бюджета. */
export const FAST_BURN = 14.4;
/** Тревога — только когда за час есть хотя бы 6 прогонов по 3 проверки: на одной-двух проверках burn rate — шум. */
export const MIN_ALERT_CHECKS = 18;

/** Боевой сайт мониторингом не трогаем (ADR 0006): адреса athleticsgym.kz и старого проекта Vercel запрещены. */
export function assertLabUrl(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host === "athleticsgym.kz" || host.endsWith(".athleticsgym.kz") || host === "athletics-gym.vercel.app") {
    throw new Error(`Отказ: ${host} — боевой сайт или его редирект; мониторинг только для Лаборатории.`);
  }
  return url;
}

/** Успешна ли проверка для SLO. */
export function isGood(check) {
  return check.status === 200 && check.ms < SLO.latencyMs;
}

export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((sorted.length * p) / 100) - 1)];
}

function stats(checks) {
  const total = checks.length;
  const good = checks.filter(isGood).length;
  const ok200 = checks.filter((c) => c.status === 200).map((c) => c.ms);
  return {
    total,
    good,
    availability: total ? good / total : null,
    p50: percentile(ok200, 50),
    p95: percentile(ok200, 95),
  };
}

/**
 * Сводка по проверкам (каждая — { t: ISO-время, target, status, ms }) на момент now.
 * Бюджет: сколько ошибок можно за 30 дней при текущем числе проверок и сколько из них осталось.
 */
export function summarize(checks, now = Date.now()) {
  const windowStart = now - SLO.windowDays * 24 * 3_600_000;
  const inWindow = checks.filter((c) => {
    const t = Date.parse(c.t);
    return t >= windowStart && t <= now;
  });
  const overall = stats(inWindow);
  const bad = overall.total - overall.good;
  const allowed = overall.total * BUDGET;
  /** @type {Record<string, number | null>} */
  const burn = {};
  let lastHourChecks = 0;
  for (const w of BURN_WINDOWS) {
    const recent = inWindow.filter((c) => Date.parse(c.t) > now - w.ms);
    const errRate = recent.length ? recent.filter((c) => !isGood(c)).length / recent.length : 0;
    burn[w.name] = recent.length ? errRate / BUDGET : null;
    if (w.name === "1h") lastHourChecks = recent.length;
  }
  /** @type {Record<string, any>} */
  const byTarget = {};
  for (const target of TARGETS) {
    const list = inWindow.filter((c) => c.target === target);
    const last = list.reduce((a, c) => (!a || Date.parse(c.t) > Date.parse(a.t) ? c : a), null);
    byTarget[target] = { ...stats(list), last };
  }
  // Прогон — одна проверка всех адресов (поле run); последний прогон — самый поздний
  const runOf = (c) => c.run ?? c.t;
  const lastRun = inWindow.reduce((a, c) => (a === null || runOf(c) > a ? runOf(c) : a), null);
  const lastRunBad = lastRun !== null && inWindow.some((c) => runOf(c) === lastRun && !isGood(c));
  return {
    generatedAt: new Date(now).toISOString(),
    slo: SLO,
    overall,
    budget: {
      allowedErrors: allowed,
      errors: bad,
      remaining: overall.total ? 1 - bad / allowed : 1,
    },
    burn,
    // Тревога быстрого выгорания: за последний час бюджет горит в 14,4 раза быстрее, последняя проверка неуспешна
    // и данных за час достаточно (MIN_ALERT_CHECKS)
    fastBurnAlert: (burn["1h"] ?? 0) >= FAST_BURN && lastRunBad && lastHourChecks >= MIN_ALERT_CHECKS,
    byTarget,
  };
}
