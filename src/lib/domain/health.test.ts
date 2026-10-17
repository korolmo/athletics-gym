import { describe, expect, it } from "vitest";
import { READY_TIMEOUT_MS, isReady, publicReadyBody, runCheck } from "./health";

describe("runCheck: проверка зависимости с тайм-аутом", () => {
  it("успех — ok и время", async () => {
    const r = await runCheck(async () => "pong");
    expect(r.ok).toBe(true);
    expect(r.ms).toBeGreaterThanOrEqual(0);
  });

  it("ошибка — не исключение, а ok: false с последней строкой сообщения", async () => {
    const r = await runCheck(async () => {
      throw new Error("Invalid `prisma.$queryRaw()` invocation:\n\nCan't reach database server");
    });
    expect(r).toMatchObject({ ok: false, error: "Can't reach database server" });
  });

  it("повисшая зависимость — fail по тайм-ауту, а не ожидание", async () => {
    const started = Date.now();
    const r = await runCheck(() => new Promise(() => {}), 50);
    expect(r).toMatchObject({ ok: false, error: "тайм-аут 50 мс" });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("тайм-аут по умолчанию — около секунды", () => {
    expect(READY_TIMEOUT_MS).toBe(1000);
  });
});

describe("готовность", () => {
  const ok = { ok: true as const, ms: 3 };
  const fail = { ok: false as const, ms: 1000, error: "тайм-аут 1000 мс" };

  it("готов, только если ответили все", () => {
    expect(isReady({ database: ok, storage: ok })).toBe(true);
    expect(isReady({ database: ok, storage: fail })).toBe(false);
    expect(isReady({ database: fail, storage: ok })).toBe(false);
  });

  it("публичный ответ — только статус: без имён зависимостей, ошибок и времени", () => {
    expect(publicReadyBody({ database: ok, storage: ok })).toEqual({ status: "ok" });
    const body = publicReadyBody({ database: fail, storage: ok });
    expect(body).toEqual({ status: "fail" });
    expect(JSON.stringify(body)).not.toMatch(/database|storage|тайм-аут|ms/);
  });
});
