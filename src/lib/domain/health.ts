// Проверки здоровья (этап 0): чистые функции без зависимостей — их берут маршруты /api/health/* и тесты.
//   /api/health/live  — процесс жив и отвечает; зависимостей не трогает (перезапускать ли процесс).
//   /api/health/ready — сайт может обслуживать запросы: база и хранилище Фото ответили за READY_TIMEOUT_MS.
//                       Наружу — только ok / fail: подробности (версии, ошибки, время) видит лишь Владелец в /api/health.

/** Сколько ждём каждую зависимость в /api/health/ready: дольше — считаем, что её нет. */
export const READY_TIMEOUT_MS = 1000;

export type CheckResult = { ok: true; ms: number } | { ok: false; ms: number; error: string };

/**
 * Выполняет проверку с тайм-аутом. Ошибка и тайм-аут — не исключение, а { ok: false }:
 * readiness обязана ответить вовремя, даже если база повисла. Сам запрос при тайм-ауте не отменяется.
 */
export async function runCheck(
  check: () => Promise<unknown>,
  timeoutMs: number = READY_TIMEOUT_MS,
  now: () => number = Date.now,
): Promise<CheckResult> {
  const started = now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`тайм-аут ${timeoutMs} мс`)), timeoutMs);
  });
  try {
    await Promise.race([check(), timeout]);
    return { ok: true, ms: now() - started };
  } catch (e) {
    return { ok: false, ms: now() - started, error: e instanceof Error ? e.message.split("\n").slice(-1)[0] : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export type ReadyChecks = Record<string, CheckResult>;

/** Готов, только если ответили все зависимости. */
export function isReady(checks: ReadyChecks): boolean {
  return Object.values(checks).every((c) => c.ok);
}

/** Публичный ответ readiness: только статус — ни имён зависимостей, ни ошибок, ни времени. */
export function publicReadyBody(checks: ReadyChecks): { status: "ok" | "fail" } {
  return { status: isReady(checks) ? "ok" : "fail" };
}

export const NO_STORE = { "Cache-Control": "no-store" } as const;
