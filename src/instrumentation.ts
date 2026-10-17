// Next вызывает register() один раз при запуске сервера (standalone на хостинге и функции Vercel).
// Строка доступа в JSON — только в Node-рантайме (ADR 0009).

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installAccessLog } = await import("./lib/observability/access-log");
    installAccessLog();
  }
}
