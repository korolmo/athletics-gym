// Строка доступа (ADR 0009): статус и длительность каждого запроса к Node-серверу Next — и в standalone
// на хостинге (start.cjs → server.js), и в функциях Vercel. Ставится один раз из instrumentation.ts:
// перехватываем событие 'request' у http.Server, засекаем время и пишем строку на 'finish' ответа.
// В строку идут только метод, путь без query, статус, длительность и request_id — без IP, cookies и тел.

import http from "node:http";
import { REQUEST_ID_HEADER, log, requestIdFrom } from "./log";

const INSTALLED = Symbol.for("athletics.accessLog");

/** Пути, которые не пишем: статика сборки и проверки живости (их дёргает мониторинг каждые минуты). */
export function skipAccessLog(path: string): boolean {
  return path.startsWith("/_next/static/") || path === "/api/health/live";
}

export function installAccessLog(): void {
  const proto = http.Server.prototype as http.Server & { [INSTALLED]?: boolean };
  if (proto[INSTALLED]) return;
  proto[INSTALLED] = true;
  const emit = proto.emit;
  proto.emit = function (this: http.Server, event: string | symbol, ...args: unknown[]) {
    if (event === "request") {
      const [req, res] = args as [http.IncomingMessage, http.ServerResponse];
      try {
        trackRequest(req, res);
      } catch {
        // Лог не должен ломать запрос
      }
    }
    return (emit as (...a: unknown[]) => boolean).apply(this, [event, ...args]);
  } as typeof proto.emit;
}

function trackRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const started = performance.now();
  const header = req.headers[REQUEST_ID_HEADER];
  const id = requestIdFrom(Array.isArray(header) ? header[0] : header);
  // Тот же id видит middleware (берёт входящий) и получает клиент
  req.headers[REQUEST_ID_HEADER] = id;
  if (!res.headersSent) res.setHeader("X-Request-Id", id);
  const path = (req.url ?? "").split("?")[0];
  if (skipAccessLog(path)) return;
  res.once("finish", () => {
    log(res.statusCode >= 500 ? "error" : "info", "request", {
      request_id: id,
      method: req.method,
      route: path,
      status: res.statusCode,
      duration_ms: performance.now() - started,
    });
  });
}
