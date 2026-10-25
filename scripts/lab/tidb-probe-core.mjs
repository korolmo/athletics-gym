// Чистые функции замера подключения к TiDB (tidb-probe.mjs) — их проверяет тест.

export const PHASES = ["dns", "tcp", "greeting", "tls", "auth", "query"];

/**
 * Длительность каждой фазы (мс) по отметкам времени { t0, dns, tcp, … }: от предыдущей пройденной фазы.
 * Фазы, до которых подключение не дошло, не попадают в результат; total — до последней пройденной.
 */
export function attemptPhases(marks) {
  /** @type {Record<string, number>} */
  const out = {};
  let prev = marks.t0;
  for (const p of PHASES) {
    if (marks[p] === undefined) break;
    out[p] = Math.round(marks[p] - prev);
    prev = marks[p];
  }
  out.total = Math.round(prev - marks.t0);
  return out;
}

const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

/** Сводка строк замера: по виду подключения (cold / warm) — медиана и максимум каждой фазы, число сбоев. */
export function summarizeProbe(rows) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const kind of ["cold", "warm", "parallel"]) {
    const list = rows.filter((r) => r.kind === kind);
    const ok = list.filter((r) => r.ok);
    /** @type {Record<string, { median: number | null, max: number | null }>} */
    const phases = {};
    for (const p of [...PHASES, "total"]) {
      const xs = ok.map((r) => r[p]).filter((x) => typeof x === "number");
      phases[p] = { median: median(xs), max: xs.length ? Math.max(...xs) : null };
    }
    out[kind] = { n: list.length, failed: list.length - ok.length, phases };
  }
  return out;
}
