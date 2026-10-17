import { describe, expect, it } from "vitest";
import { READY_TIMEOUT_MS, createDependencyCheck, isReady, publicReadyBody, runCheck } from "./health";

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

describe("холодный старт: первое соединение — со своим тайм-аутом", () => {
  const slow = (ms: number) => () => new Promise((r) => setTimeout(r, ms));

  it("медленное первое обращение проходит, такое же потом — уже нет", async () => {
    const check = createDependencyCheck(slow(80), { readyMs: 40, connectMs: 200 });
    expect((await check()).ok).toBe(true);
    expect(await check()).toMatchObject({ ok: false, error: "тайм-аут 40 мс" });
  });

  it("явное соединение (Prisma $connect) — отдельно, запрос после него — с обычным тайм-аутом", async () => {
    const check = createDependencyCheck(slow(5), { connect: slow(80), readyMs: 40, connectMs: 200 });
    expect((await check()).ok).toBe(true);
    const neverConnects = createDependencyCheck(slow(5), { connect: () => new Promise(() => {}), readyMs: 40, connectMs: 60 });
    expect(await neverConnects()).toMatchObject({ ok: false, error: "тайм-аут 60 мс" });
  });

  it("неудача не делает зависимость «тёплой»: следующая попытка снова с тайм-аутом соединения", async () => {
    let calls = 0;
    const check = createDependencyCheck(async () => {
      calls++;
      if (calls === 1) throw new Error("ECONNRESET");
      await new Promise((r) => setTimeout(r, 80));
    }, { readyMs: 40, connectMs: 200 });
    expect((await check()).ok).toBe(false);
    expect((await check()).ok).toBe(true);
  });
});
