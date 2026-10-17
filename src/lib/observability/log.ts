// Структурные логи (этап 0, ADR 0009): одна строка JSON в stdout на событие — так их читают и Vercel, и журнал Plesk.
// Поля — только из белого списка: ни IP, ни cookies, ни заголовков, ни тел запросов и полей форм в лог не попадает
// даже по ошибке вызова. Ошибка пишется как имя и первая строка сообщения, без стека и вложенных данных.
// Без зависимостей от Next и Node-модулей: файл берут middleware (edge), сервер и тесты.

export type LogLevel = "info" | "warn" | "error";

export type LogFields = {
  request_id?: string;
  route?: string;
  method?: string;
  status?: number;
  duration_ms?: number;
  error?: unknown;
};

const ALLOWED = ["request_id", "route", "method", "status", "duration_ms"] as const;
const MAX_TEXT = 300;

/** Версия кода: RELEASE (CI, start.cjs из release.txt), запасная — sha коммита у Git-деплоев Vercel. */
export function release(env: Record<string, string | undefined> = process.env): string {
  return env.RELEASE?.trim() || env.VERCEL_GIT_COMMIT_SHA?.trim() || "dev";
}

/** Маршрут без строки запроса: в query могут оказаться данные Посетителя. */
export function routeOf(url: string | undefined): string {
  if (!url) return "";
  const path = url.split("?")[0].split("#")[0];
  return path.length > MAX_TEXT ? `${path.slice(0, MAX_TEXT)}…` : path;
}

function errorText(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message.split("\n").filter(Boolean).slice(-1)[0] ?? ""}`.slice(0, MAX_TEXT);
  return String(e).slice(0, MAX_TEXT);
}

/** Собирает запись лога; всё, чего нет в белом списке, отбрасывается. */
export function buildRecord(level: LogLevel, msg: string, fields: LogFields = {}, now: Date = new Date()): Record<string, unknown> {
  const record: Record<string, unknown> = { level, time: now.toISOString(), msg: msg.slice(0, MAX_TEXT), release: release() };
  for (const key of ALLOWED) {
    const value = fields[key];
    if (value === undefined || value === null) continue;
    if (key === "status" || key === "duration_ms") {
      if (typeof value === "number" && Number.isFinite(value)) record[key] = key === "duration_ms" ? Math.round(value) : value;
    } else if (typeof value === "string") {
      record[key] = key === "route" ? routeOf(value) : value.slice(0, 100);
    }
  }
  if (fields.error !== undefined) record.error = errorText(fields.error);
  return record;
}

export function log(level: LogLevel, msg: string, fields?: LogFields): void {
  console.log(JSON.stringify(buildRecord(level, msg, fields)));
}

/** Ошибка, которую код поймал и обработал сам (сайт продолжает работать). */
export function logError(msg: string, error: unknown, fields?: Omit<LogFields, "error">): void {
  log("error", msg, { ...fields, error });
}

// ——— request_id ———

export const REQUEST_ID_HEADER = "x-request-id";
/** Начало запроса (Date.now() в middleware): на Vercel по ней считается длительность в строке доступа. */
export const REQUEST_START_HEADER = "x-request-start";
const REQUEST_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

/** Входящий X-Request-Id берём, только если он похож на идентификатор (от прокси); иначе — новый. */
export function requestIdFrom(incoming: string | null | undefined): string {
  return incoming && REQUEST_ID_RE.test(incoming) ? incoming : crypto.randomUUID();
}
