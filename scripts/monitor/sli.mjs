// SLI/SLO Лаборатории (ADR 0014): чистые функции без зависимостей — их берут uptimerobot-fetch.mjs, report.mjs и тесты.
// Источник проверок — UptimeRobot, каждые 5 минут. SLO: 99,5 % проверок страниц /ru и /kk за 30 дней успешны;
// успех — HTTP 200 (и ключевое слово страницы) быстрее 1 с. /api/health/ready — диагностика, в SLO не входит.
// Холодный старт — отдельный SLI по заголовку X-Cold-Start (замер после каждой выкатки, cold-start.mjs).
// Бюджет ошибок — 0,5 % проверок окна; burn rate — доля ошибок в окне / 0,5 % (1 — бюджет тратится ровно за 30 дней).

export const SLO = { target: 0.995, windowDays: 30, latencyMs: 1000 };
export const BUDGET = 1 - SLO.target;
/** Страницы, по которым считается SLO. */
export const SLO_TARGETS = ["/ru", "/kk"];
/** Диагностика: видна на странице статуса, но бюджет не тратит. */
export const DIAG_TARGETS = ["/api/health/ready"];
export const TARGETS = [...SLO_TARGETS, ...DIAG_TARGETS];

/** Интервал UptimeRobot (бесплатный план — не чаще): 12 проверок в час на адрес. */
export const CHECK_INTERVAL_MIN = 5;
export const CHECKS_PER_HOUR = 60 / CHECK_INTERVAL_MIN;
const HOUR = 3_600_000;

export const BURN_WINDOWS = [
  { name: "1h", ms: HOUR },
  { name: "6h", ms: 6 * HOUR },
  { name: "24h", ms: 24 * HOUR },
  { name: "30d", ms: SLO.windowDays * 24 * HOUR },
];

/**
 * Тревоги выгорания (Google SRE workbook): быстрая — за час уходит 2 % месячного бюджета (burn ≥ 14,4),
 * медленная — за 6 часов 5 % (burn ≥ 6). При 12 проверках в час на 2 страницы это 24 проверки в час:
 * быстрая — 2 неуспешные из 24 за час, медленная — 5 из 144 за 6 часов.
 * Окно считается, только если в нём не меньше 75 % ожидаемых проверок: на дырявых данных burn rate — шум.
 */
export const ALERTS = [
  { name: "fastBurn", windowMs: HOUR, burn: 14.4 },
  { name: "slowBurn", windowMs: 6 * HOUR, burn: 6 },
];
export const MIN_WINDOW_SHARE = 0.75;

/**
 * Мониторинг мониторинга: за сутки на каждый адрес ждём 288 проверок; меньше 260 (90 %) — тревога.
 * И последняя проверка не старше 2 часов на момент отчёта: иначе UptimeRobot не опрашивает адрес.
 */
export const MIN_DAILY_CHECKS = 260;
export const MAX_DATA_AGE_MS = 2 * HOUR;
/** Отчёт ищет выгорание в окнах, закончившихся за последние сутки: его пересчитывают раз в сутки. */
export const ALERT_LOOKBACK_MS = 24 * HOUR;

/** Холодный старт (ADR 0011, 0014): первый запрос экземпляра (X-Cold-Start: 1) быстрее 1,5 с в 90 % случаев. */
export const COLD_START = { latencyMs: 1500, target: 0.9 };

/** Боевой сайт мониторингом не трогаем (ADR 0006): адреса athleticsgym.kz и старого проекта Vercel запрещены. */
export function assertLabUrl(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host === "athleticsgym.kz" || host.endsWith(".athleticsgym.kz") || host === "athletics-gym.vercel.app") {
    throw new Error(`Отказ: ${host} — боевой сайт или его редирект; мониторинг только для Лаборатории.`);
  }
  return url;
}

/** Успешна ли проверка для SLO. ms нет — UptimeRobot записал адрес как недоступный. */
export function isGood(check) {
  return check.status === 200 && typeof check.ms === "number" && check.ms < SLO.latencyMs;
}

export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((sorted.length * p) / 100) - 1)];
}

function stats(checks) {
  const total = checks.length;
  const good = checks.filter(isGood).length;
  const ok200 = checks.filter((c) => c.status === 200 && typeof c.ms === "number").map((c) => c.ms);
  return {
    total,
    good,
    availability: total ? good / total : null,
    p50: percentile(ok200, 50),
    p95: percentile(ok200, 95),
  };
}

/** Доля ошибок в окне (start, end] → burn rate; null, если проверок меньше доли MIN_WINDOW_SHARE от ожидаемых. */
function windowBurn(sorted, start, end, windowMs) {
  let total = 0;
  let bad = 0;
  for (const c of sorted) {
    if (c.ts <= start) continue;
    if (c.ts > end) break;
    total++;
    if (!isGood(c)) bad++;
  }
  const expected = (windowMs / HOUR) * CHECKS_PER_HOUR * SLO_TARGETS.length;
  if (total < expected * MIN_WINDOW_SHARE) return null;
  return bad / total / BUDGET;
}

/** Худший burn rate среди окон длины windowMs, закончившихся за последние сутки (шаг — интервал проверок). */
export function worstBurn(sloChecks, windowMs, now) {
  const sorted = sloChecks.map((c) => ({ ...c, ts: Date.parse(c.t) })).sort((a, b) => a.ts - b.ts);
  let worst = null;
  for (let end = now; end > now - ALERT_LOOKBACK_MS; end -= CHECK_INTERVAL_MIN * 60_000) {
    const b = windowBurn(sorted, end - windowMs, end, windowMs);
    if (b !== null && (worst === null || b > worst)) worst = b;
  }
  return worst;
}

/** Холодные старты: замеры cold-start.mjs ({ t, coldStart: "1" | "0" | null, status, ms }). */
export function summarizeColdStarts(rows, now = Date.now()) {
  const from = now - SLO.windowDays * 24 * HOUR;
  const inWindow = rows.filter((r) => Date.parse(r.t) >= from && Date.parse(r.t) <= now);
  const cold = inWindow.filter((r) => r.coldStart === "1");
  const good = cold.filter((r) => r.status === 200 && r.ms < COLD_START.latencyMs).length;
  return {
    measured: inWindow.length,
    cold: cold.length,
    // Замер сразу после выкатки, а экземпляр уже тёплый: запрос попал на экземпляр, поднятый кем-то раньше
    notCold: inWindow.length - cold.length,
    good,
    share: cold.length ? good / cold.length : null,
    p50: percentile(cold.map((r) => r.ms), 50),
    max: cold.length ? Math.max(...cold.map((r) => r.ms)) : null,
  };
}

/**
 * Сводка по проверкам (каждая — { t: ISO-время, target, status, ms }) на момент now.
 * Бюджет: сколько ошибок можно за 30 дней при текущем числе проверок страниц и сколько из них осталось.
 */
export function summarize(checks, now = Date.now(), coldStarts = []) {
  const windowStart = now - SLO.windowDays * 24 * HOUR;
  const inWindow = checks.filter((c) => {
    const t = Date.parse(c.t);
    return t >= windowStart && t <= now;
  });
  const sloChecks = inWindow.filter((c) => SLO_TARGETS.includes(c.target));
  const overall = stats(sloChecks);
  const bad = overall.total - overall.good;
  const allowed = overall.total * BUDGET;

  /** @type {Record<string, number | null>} */
  const burn = {};
  for (const w of BURN_WINDOWS) {
    const recent = sloChecks.filter((c) => Date.parse(c.t) > now - w.ms);
    burn[w.name] = recent.length ? recent.filter((c) => !isGood(c)).length / recent.length / BUDGET : null;
  }

  /** @type {Record<string, any>} */
  const byTarget = {};
  const lowCoverage = [];
  let newest = null;
  for (const target of TARGETS) {
    const list = inWindow.filter((c) => c.target === target);
    const last = list.reduce((a, c) => (!a || Date.parse(c.t) > Date.parse(a.t) ? c : a), null);
    const lastDay = list.filter((c) => Date.parse(c.t) > now - 24 * HOUR).length;
    if (lastDay < MIN_DAILY_CHECKS) lowCoverage.push({ target, checks: lastDay });
    if (last && (newest === null || Date.parse(last.t) > newest)) newest = Date.parse(last.t);
    byTarget[target] = { ...stats(list), slo: SLO_TARGETS.includes(target), lastDay, last };
  }

  /** @type {Record<string, any>} */
  const alerts = {};
  for (const a of ALERTS) {
    const worst = worstBurn(sloChecks, a.windowMs, now);
    alerts[a.name] = { threshold: a.burn, worst, firing: worst !== null && worst >= a.burn };
  }
  alerts.lowCoverage = { min: MIN_DAILY_CHECKS, targets: lowCoverage, firing: lowCoverage.length > 0 };
  const ageMs = newest === null ? null : now - newest;
  alerts.stale = { maxAgeMin: MAX_DATA_AGE_MS / 60_000, ageMin: ageMs === null ? null : Math.round(ageMs / 60_000), firing: ageMs === null || ageMs > MAX_DATA_AGE_MS };

  return {
    generatedAt: new Date(now).toISOString(),
    source: "UptimeRobot, каждые 5 минут (ADR 0014)",
    slo: { ...SLO, targets: SLO_TARGETS },
    overall,
    budget: {
      allowedErrors: allowed,
      errors: bad,
      remaining: overall.total ? 1 - bad / allowed : 1,
    },
    burn,
    alerts,
    alerting: Object.values(alerts).some((a) => a.firing),
    coldStart: { ...COLD_START, ...summarizeColdStarts(coldStarts, now) },
    byTarget,
  };
}
