// ВРЕМЕННО (замер памяти): @sentry/nextjs на сервере.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installAccessLog } = await import("./lib/observability/access-log");
    installAccessLog();
    if (process.env.SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0, sendDefaultPii: false });
    }
  }
}

export async function onRequestError(...args: unknown[]): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    (Sentry.captureRequestError as (...a: unknown[]) => void)(...args);
  }
}
