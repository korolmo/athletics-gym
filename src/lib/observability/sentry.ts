// Ошибки сервера → Sentry (этап 0, ADR 0010) — свой минимальный отправщик вместо @sentry/nextjs:
// SDK добавлял к памяти процесса больше 25 МБ при лимите хостинга 256 МБ. Только сервер, только Лаборатория:
// SENTRY_DSN пуст — отправки нет (на хостинге её нет). Шлём конверт (envelope) в API Sentry напрямую.
// В событии: тип и текст ошибки, стек, маршрут без query, метод, digest Next, release и среда.
// Не шлём: заголовки, cookies, тела запросов, поля форм, IP Посетителя, query.

import { release, routeOf } from "./log";

export type Dsn = { endpoint: string; publicKey: string; dsn: string };

/** DSN вида https://<key>@<host>/<project> → адрес конверта и ключ. Неверный или пустой — null (отправки нет). */
export function parseDsn(raw: string | undefined): Dsn | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    const project = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!u.username || !/^\d+$/.test(project.split("/").pop() ?? "") || !/^https?:$/.test(u.protocol)) return null;
    const prefix = project.split("/").slice(0, -1).join("/");
    const id = project.split("/").pop();
    return {
      endpoint: `${u.protocol}//${u.host}/${prefix ? `${prefix}/` : ""}api/${id}/envelope/`,
      publicKey: u.username,
      dsn: raw.trim(),
    };
  } catch {
    return null;
  }
}

type Frame = { function?: string; filename?: string; lineno?: number; colno?: number; in_app: boolean };

/** Стек V8 → кадры Sentry (от внешнего к внутреннему, как ждёт Sentry). */
export function parseStack(stack: string | undefined): Frame[] {
  if (!stack) return [];
  const frames: Frame[] = [];
  for (const line of stack.split("\n").slice(1, 51)) {
    const m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line);
    if (!m) continue;
    const filename = m[2];
    frames.push({
      function: m[1],
      filename,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !/node_modules|node:internal|^node:/.test(filename),
    });
  }
  return frames.reverse();
}

export type RequestInfo = { path?: string; method?: string };
export type ErrorContext = { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string };

const text = (s: unknown, max = 1000) => String(s ?? "").slice(0, max);

/** Событие Sentry: только белый список полей. */
export function buildEvent(error: unknown, request: RequestInfo = {}, context: ErrorContext = {}, env: Record<string, string | undefined> = process.env) {
  const e = error instanceof Error ? error : new Error(text(error));
  const digest = (e as Error & { digest?: unknown }).digest;
  return {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    release: release(env),
    environment: env.APP_ENV?.trim() || "dev",
    exception: { values: [{ type: text(e.name, 100), value: text(e.message), stacktrace: { frames: parseStack(e.stack) } }] },
    tags: {
      route: text(context.routePath ?? routeOf(request.path), 200),
      route_type: text(context.routeType, 50),
      router_kind: text(context.routerKind, 50),
      ...(typeof digest === "string" ? { digest: digest.slice(0, 100) } : {}),
    },
    request: { url: routeOf(request.path), method: text(request.method, 10) },
  };
}

/** Конверт: заголовок, заголовок элемента, само событие — по строке JSON. */
export function envelope(dsn: Dsn, event: ReturnType<typeof buildEvent>): string {
  return [
    JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString(), dsn: dsn.dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");
}

/** Отправляет ошибку; никогда не бросает и ждёт не дольше 2 с. Вернёт true, если Sentry принял. */
export async function captureError(
  error: unknown,
  request?: RequestInfo,
  context?: ErrorContext,
  { env = process.env, fetchImpl = fetch }: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch } = {},
): Promise<boolean> {
  const dsn = parseDsn(env.SENTRY_DSN);
  if (!dsn) return false;
  try {
    const r = await fetchImpl(dsn.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=athletics-minimal/1.0`,
      },
      body: envelope(dsn, buildEvent(error, request, context, env)),
      signal: AbortSignal.timeout(2000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
