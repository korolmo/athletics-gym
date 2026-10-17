// Next вызывает register() один раз при запуске сервера (standalone на хостинге и функции Vercel).
// Строка доступа в JSON — только в Node-рантайме (ADR 0009).
// Ошибки запросов → Sentry своим отправщиком, только при заданном SENTRY_DSN (Лаборатория; ADR 0010).

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installAccessLog } = await import("./lib/observability/access-log");
    installAccessLog();
  }
}

type RequestInfo = { path?: string; method?: string };
type ErrorContext = { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string };

export async function onRequestError(error: unknown, request: RequestInfo, context: ErrorContext): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const { captureError } = await import("./lib/observability/sentry");
  // Из запроса берём только путь и метод: заголовки, cookies и тело в Sentry не уходят
  await captureError(error, { path: request?.path, method: request?.method }, context);
}
