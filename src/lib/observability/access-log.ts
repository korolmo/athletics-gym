// Строка доступа (ADR 0009): статус и длительность каждого запроса к Node-серверу Next — и в standalone
// на хостинге (start.cjs → server.js), и в функциях Vercel. Ставится один раз из instrumentation.ts.
//   Начало запроса: событие 'request' у http.Server (хостинг, точно); на Vercel его нет — обработчик Next
//   вызывается в обход http.Server, и начало берём из метки x-request-start, которую ставит middleware.
//   Конец: первый вызов end() у http.ServerResponse — он есть в обеих средах; строка пишется на 'finish'.
// В строку идут только метод, путь без query, статус, длительность и request_id — без IP, cookies и тел.

import http from "node:http";
import { REQUEST_ID_HEADER, REQUEST_START_HEADER, log, requestIdFrom } from "./log";

const INSTALLED = Symbol.for("athletics.accessLog");
const STATS = Symbol.for("athletics.accessLogStats");
const START = Symbol("athletics.requestStart");
const LOGGED = Symbol("athletics.requestLogged");

type Stats = { installed: boolean; requests: number; serverEvents: number };
const g = globalThis as typeof globalThis & { [STATS]?: Stats };
const stats = (g[STATS] ??= { installed: false, requests: 0, serverEvents: 0 });

type Req = http.IncomingMessage & { [START]?: number };
type Res = http.ServerResponse & { [LOGGED]?: boolean };

/** Для /api/health: стоит ли перехват и сколько строк он записал в этом процессе. */
export function accessLogStats(): Stats {
  return { ...stats };
}

/** Пути, которые не пишем: статика сборки и проверки живости (их дёргает мониторинг каждые минуты). */
export function skipAccessLog(path: string): boolean {
  return path.startsWith("/_next/static/") || path === "/api/health/live";
}

/** Длительность: от точного начала (хостинг) или от метки middleware (Vercel; метка — Date.now() на краю сети). */
export function durationMs(startPerf: number | undefined, startHeader: string | undefined, nowPerf: number, nowEpoch: number): number | undefined {
  if (startPerf !== undefined) return nowPerf - startPerf;
  const epoch = Number(startHeader);
  if (!Number.isFinite(epoch) || epoch <= 0) return undefined;
  const ms = nowEpoch - epoch;
  // Метка из будущего или старше минуты — не наша (рассинхрон часов или подделка): длительность не пишем
  return ms >= 0 && ms < 60_000 ? ms : undefined;
}

const header = (req: http.IncomingMessage, name: string): string | undefined => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

export function installAccessLog(): void {
  const server = http.Server.prototype as http.Server & { [INSTALLED]?: boolean };
  if (server[INSTALLED]) return;
  server[INSTALLED] = true;
  stats.installed = true;

  const emit = server.emit;
  server.emit = function (this: http.Server, event: string | symbol, ...args: unknown[]) {
    if (event === "request") {
      try {
        const [req, res] = args as [Req, Res];
        stats.serverEvents++;
        req[START] = performance.now();
        // Тот же id видит middleware (берёт входящий) и получает клиент
        const id = requestIdFrom(header(req, REQUEST_ID_HEADER));
        req.headers[REQUEST_ID_HEADER] = id;
        if (!res.headersSent) res.setHeader("X-Request-Id", id);
      } catch {
        // Лог не должен ломать запрос
      }
    }
    return (emit as (...a: unknown[]) => boolean).apply(this, [event, ...args]);
  } as typeof server.emit;

  const response = http.ServerResponse.prototype as Res;
  const end = response.end;
  response.end = function (this: Res, ...args: unknown[]) {
    try {
      if (!this[LOGGED] && this.req) {
        this[LOGGED] = true;
        track(this.req as Req, this);
      }
    } catch {
      // Лог не должен ломать ответ
    }
    return (end as (...a: unknown[]) => Res).apply(this, args);
  } as typeof response.end;
}

function track(req: Req, res: Res): void {
  const path = (req.url ?? "").split("?")[0];
  if (skipAccessLog(path)) return;
  const id = header(req, REQUEST_ID_HEADER) ?? (res.getHeader("x-request-id") as string | undefined);
  res.once("finish", () => {
    stats.requests++;
    log(res.statusCode >= 500 ? "error" : "info", "request", {
      request_id: id,
      method: req.method,
      route: path,
      status: res.statusCode,
      duration_ms: durationMs(req[START], header(req, REQUEST_START_HEADER), performance.now(), Date.now()),
    });
  });
}
