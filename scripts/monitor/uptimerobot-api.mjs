// Вызов API UptimeRobot v2. Ключ — только из UPTIMEROBOT_API_KEY; в вывод и ошибки не попадает.

const API = "https://api.uptimerobot.com/v2/";

export function apiKey() {
  const key = process.env.UPTIMEROBOT_API_KEY;
  if (!key) {
    console.error("Нет UPTIMEROBOT_API_KEY (секрет GitHub; локально — .env.lab, node --env-file=.env.lab …)");
    process.exit(2);
  }
  return key;
}

/** POST <метод> с параметрами формы; ответ с stat !== "ok" — ошибка с текстом UptimeRobot. */
export async function call(method, params = {}) {
  const body = new URLSearchParams({ api_key: apiKey(), format: "json", ...params });
  const r = await fetch(API + method, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`UptimeRobot ${method}: HTTP ${r.status}, ответ не JSON`);
  }
  if (json.stat !== "ok") throw new Error(`UptimeRobot ${method}: ${JSON.stringify(json.error ?? json).slice(0, 300)}`);
  return json;
}

/** Все мониторы аккаунта (постранично, по 50). */
export async function allMonitors(params = {}) {
  const out = [];
  for (let offset = 0; ; offset += 50) {
    const r = await call("getMonitors", { limit: "50", offset: String(offset), ...params });
    out.push(...(r.monitors ?? []));
    if (out.length >= Number(r.pagination?.total ?? out.length) || (r.monitors ?? []).length === 0) return out;
  }
}
