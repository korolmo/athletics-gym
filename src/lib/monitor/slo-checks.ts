// Проверки UptimeRobot за последние часы — для тревог выгорания Лаборатории (этап 5, ADR 0028). Платформа:
// сеть и разбор ответа, без модулей. Разбор журнала и список мониторов — те же чистые функции, что у суточного
// отчёта (scripts/monitor/uptimerobot-core.mjs), чтобы тревога и страница статуса считали одинаково.
import { desiredMonitors, monitorChecks } from "../../../scripts/monitor/uptimerobot-core.mjs";

export type SloCheck = { t: string; target: string; status: number; ms: number | null };

const API = "https://api.uptimerobot.com/v2/getMonitors";

/**
 * Проверки адресов Лаборатории за [now − lookbackMs, now] по ключу «только чтение». Ключ в ошибки не попадает.
 * Монитора нет или API ответил ошибкой — исключение: для тревог это «мониторинг слеп».
 */
export async function fetchSloChecks(readKey: string, labUrl: string, lookbackMs: number, now = Date.now(), fetchImpl: typeof fetch = fetch): Promise<SloCheck[]> {
  const toSec = Math.floor(now / 1000);
  const fromSec = toSec - Math.floor(lookbackMs / 1000);
  const body = new URLSearchParams({
    api_key: readKey,
    format: "json",
    response_times: "1",
    response_times_start_date: String(fromSec),
    response_times_end_date: String(toSec),
    logs: "1",
    logs_start_date: String(fromSec),
    logs_end_date: String(toSec),
    limit: "50",
  });
  const r = await fetchImpl(API, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await r.json().catch(() => null)) as { stat?: string; monitors?: { url: string }[] } | null;
  if (!json || json.stat !== "ok") throw new Error(`UptimeRobot getMonitors: HTTP ${r.status}`);
  const checks: SloCheck[] = [];
  for (const d of desiredMonitors(labUrl)) {
    const m = (json.monitors ?? []).find((x) => x.url === d.url);
    if (!m) throw new Error(`UptimeRobot: нет монитора ${d.target}`);
    checks.push(...monitorChecks(m, d.target, fromSec, toSec));
  }
  return checks;
}
