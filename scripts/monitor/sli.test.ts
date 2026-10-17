import { describe, expect, it } from "vitest";
import { FAST_BURN, assertLabUrl, isGood, percentile, summarize } from "./sli.mjs";

const NOW = Date.parse("2026-10-17T12:00:00Z");
const at = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();
const check = (minutesAgo: number, target: string, status = 200, ms = 200) => ({ run: at(minutesAgo), t: at(minutesAgo), target, status, ms });
/** n прогонов каждые 5 минут, по три адреса. */
function runs(n: number, bad: (i: number) => boolean = () => false) {
  return Array.from({ length: n }, (_, i) => ["/ru", "/kk", "/api/health/ready"].map((t) => check(i * 5, t, bad(i) ? 503 : 200))).flat();
}

describe("SLI", () => {
  it("успех — 200 и быстрее секунды", () => {
    expect(isGood({ status: 200, ms: 999 })).toBe(true);
    expect(isGood({ status: 200, ms: 1000 })).toBe(false);
    expect(isGood({ status: 503, ms: 10 })).toBe(false);
    expect(isGood({ status: 0, ms: 10_000 })).toBe(false);
  });

  it("процентиль", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([...Array(100).keys()].map((i) => i + 1), 95)).toBe(95);
    expect(percentile([], 95)).toBeNull();
  });

  it("мониторинг боевого сайта запрещён", () => {
    expect(() => assertLabUrl("https://athleticsgym.kz")).toThrow(/Отказ/);
    expect(() => assertLabUrl("https://www.athleticsgym.kz/ru")).toThrow(/Отказ/);
    expect(() => assertLabUrl("https://athletics-gym.vercel.app")).toThrow(/Отказ/);
    expect(assertLabUrl("https://athletics-gym-lab.vercel.app")).toBe("https://athletics-gym-lab.vercel.app");
  });
});

describe("SLO 99,5 % за 30 дней: бюджет и burn rate", () => {
  it("всё зелёное — 100 %, бюджет цел, burn 0", () => {
    const s = summarize(runs(100), NOW);
    expect(s.overall).toMatchObject({ total: 300, good: 300, availability: 1 });
    expect(s.budget.remaining).toBe(1);
    expect(s.burn["1h"]).toBe(0);
    expect(s.fastBurnAlert).toBe(false);
  });

  it("ошибки ровно на бюджет (0,5 %) — остаток 0, burn 30 дней = 1", () => {
    // 1000 прогонов = 3000 проверок; 0,5 % = 15 проверок = 5 прогонов; ошибки — давно, вне последних суток
    const s = summarize(runs(1000, (i) => i >= 995), NOW);
    expect(s.budget.allowedErrors).toBeCloseTo(15);
    expect(s.budget.errors).toBe(15);
    expect(s.budget.remaining).toBeCloseTo(0);
    expect(s.burn["30d"]).toBeCloseTo(1);
    expect(s.burn["1h"]).toBe(0);
  });

  it("сайт лежит последний час — быстрое выгорание и тревога", () => {
    const s = summarize(runs(500, (i) => i < 12), NOW);
    expect(s.burn["1h"]).toBeGreaterThanOrEqual(FAST_BURN);
    expect(s.fastBurnAlert).toBe(true);
    expect(s.byTarget["/ru"].last.status).toBe(503);
  });

  it("сайт поднялся — тревоги нет, хотя час был плохим", () => {
    const s = summarize(runs(500, (i) => i > 0 && i < 12), NOW);
    expect(s.burn["1h"]).toBeGreaterThanOrEqual(FAST_BURN);
    expect(s.fastBurnAlert).toBe(false);
  });

  it("проверки старше 30 дней не считаются", () => {
    const old = { run: at(31 * 24 * 60), t: at(31 * 24 * 60), target: "/ru", status: 503, ms: 50 };
    expect(summarize([...runs(10), old], NOW).overall.total).toBe(30);
  });

  it("нет данных — без деления на ноль", () => {
    const s = summarize([], NOW);
    expect(s.overall.availability).toBeNull();
    expect(s.budget.remaining).toBe(1);
    expect(s.burn["1h"]).toBeNull();
  });
});

describe("тревога на малых данных", () => {
  it("один-два прогона с ошибкой — burn высокий, но тревоги нет", () => {
    const s = summarize(runs(2, (i) => i === 0), NOW);
    expect(s.burn["1h"]).toBeGreaterThanOrEqual(FAST_BURN);
    expect(s.fastBurnAlert).toBe(false);
  });
});
