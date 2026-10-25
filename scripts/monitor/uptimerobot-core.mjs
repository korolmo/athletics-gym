// UptimeRobot — источник проверок Лаборатории (ADR 0014): чистые функции без сети. Тест — uptimerobot.test.ts.
// API v2 (https://uptimerobot.com/api/): мониторы, их время ответа (response_times) и журнал падений (logs).

import { CHECK_INTERVAL_MIN, TARGETS, assertLabUrl } from "./sli.mjs";

/**
 * Ключевое слово страниц /ru и /kk: первый экран главной (sections/Hero.tsx). Его нельзя скрыть в админке,
 * и его нет на страницах ошибок — значит, 200 со страницей ошибки или пустой оболочкой UptimeRobot засчитает как сбой.
 */
export const HOME_KEYWORD = 'id="top"';
/** Тип монитора: 1 — HTTP(s), 2 — ключевое слово. keyword_type 2 — «сбой, если слова нет». */
const HTTP = 1;
const KEYWORD = 2;
const KEYWORD_NOT_EXISTS = 2;
/** Метка в имени: по ней скрипт узнаёт свои мониторы, чужие не трогает. */
export const NAME_PREFIX = "Athletic's Gym Lab";

/** Нужные мониторы: страницы — с ключевым словом, readiness — по коду ответа. */
export function desiredMonitors(base) {
  assertLabUrl(base);
  const root = base.replace(/\/+$/, "");
  return TARGETS.map((target) => {
    const page = target === "/ru" || target === "/kk";
    return {
      target,
      friendly_name: `${NAME_PREFIX} ${target}`,
      url: root + target,
      type: page ? KEYWORD : HTTP,
      ...(page ? { keyword_type: KEYWORD_NOT_EXISTS, keyword_value: HOME_KEYWORD } : {}),
      interval: CHECK_INTERVAL_MIN * 60,
    };
  });
}

const FIELDS = ["friendly_name", "type", "keyword_type", "keyword_value", "interval"];

/**
 * Что сделать, чтобы в UptimeRobot были ровно нужные мониторы: сверка по адресу.
 * Создать недостающие, поправить отличающиеся; лишние и чужие не удаляем (только сообщаем о своих лишних).
 * @param {any[]} existing — monitors из getMonitors
 * @param {ReturnType<typeof desiredMonitors>} desired
 */
export function planMonitors(existing, desired) {
  const create = [];
  const update = [];
  const ok = [];
  for (const d of desired) {
    const found = existing.find((m) => m.url === d.url);
    if (!found) {
      create.push(d);
      continue;
    }
    /** @type {Record<string, any>} */
    const changes = {};
    for (const f of FIELDS) {
      if (d[f] !== undefined && String(found[f] ?? "") !== String(d[f])) changes[f] = d[f];
    }
    if (Object.keys(changes).length) update.push({ id: found.id, target: d.target, changes });
    else ok.push({ id: found.id, target: d.target });
  }
  const urls = new Set(desired.map((d) => d.url));
  const extra = existing.filter((m) => String(m.friendly_name ?? "").startsWith(NAME_PREFIX) && !urls.has(m.url)).map((m) => m.url);
  return { create, update, ok, extra };
}

/** Тело запроса newMonitor / editMonitor (форма x-www-form-urlencoded, без ключа). */
export function monitorParams(m) {
  /** @type {Record<string, string>} */
  const p = {};
  for (const f of ["friendly_name", "url", ...FIELDS.slice(1)]) if (m[f] !== undefined) p[f] = String(m[f]);
  return p;
}

const iso = (sec) => new Date(sec * 1000).toISOString();

/**
 * Проверки одного монитора за [fromSec, toSec] в формате SLI: { t, target, status, ms, source }.
 * Успешные — из response_times (время ответа, мс). Сбои — из журнала: падение (type 1) длительностью duration
 * секунд — это ceil(duration / interval) неуспешных проверок подряд; время ответа внутри падения не считаем.
 * Код сбоя — reason.code журнала, если это код HTTP, иначе 0 (тайм-аут, нет ключевого слова, сеть).
 */
export function monitorChecks(monitor, target, fromSec, toSec) {
  const interval = Number(monitor.interval) || CHECK_INTERVAL_MIN * 60;
  const downs = [];
  const checks = [];
  for (const log of monitor.logs ?? []) {
    if (Number(log.type) !== 1) continue;
    const start = Number(log.datetime);
    // Падение ещё идёт: duration — до момента запроса, не дальше toSec
    const end = Math.min(start + Math.max(Number(log.duration) || interval, interval), toSec);
    downs.push([start, end]);
    const code = Number(log.reason?.code);
    const status = code >= 100 && code < 600 ? code : 0;
    for (let t = start; t < end; t += interval) {
      if (t >= fromSec && t <= toSec) checks.push({ t: iso(t), target, status, ms: null, source: "uptimerobot-log" });
    }
  }
  for (const r of monitor.response_times ?? []) {
    const t = Number(r.datetime);
    if (t < fromSec || t > toSec) continue;
    if (downs.some(([s, e]) => t >= s && t < e)) continue;
    checks.push({ t: iso(t), target, status: 200, ms: Number(r.value), source: "uptimerobot" });
  }
  return checks.sort((a, b) => a.t.localeCompare(b.t));
}

/** Слить новые проверки с уже записанными: одна строка на (адрес, время), новая побеждает. */
export function mergeChecks(existing, incoming) {
  const key = (c) => `${c.target} ${c.t}`;
  const byKey = new Map(existing.map((c) => [key(c), c]));
  for (const c of incoming) byKey.set(key(c), c);
  return [...byKey.values()].sort((a, b) => a.t.localeCompare(b.t) || a.target.localeCompare(b.target));
}
