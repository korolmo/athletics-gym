import { describe, expect, it } from "vitest";
import { MIN_DAILY_CHECKS, assertLabUrl, isGood, percentile, summarize, summarizeColdStarts } from "./sli.mjs";

const NOW = Date.parse("2026-10-27T12:00:00Z");
const at = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();
const check = (minutesAgo: number, target: string, status = 200, ms: number | null = 200) => ({ t: at(minutesAgo), target, status, ms });
/** n проверок UptimeRobot каждые 5 минут по трём адресам; bad(i, target) — неуспешная проверка. */
function checks(n: number, bad: (i: number, target: string) => boolean = () => false) {
  return Array.from({ length: n }, (_, i) =>
    ["/ru", "/kk", "/api/health/ready"].map((t) => (bad(i, t) ? check(i * 5, t, 0, null) : check(i * 5, t))),
  ).flat();
}
const DAY = 288;

describe("SLI", () => {
  it("успех — 200 и быстрее секунды; сбой из журнала UptimeRobot (без времени) — неуспех", () => {
    expect(isGood({ status: 200, ms: 999 })).toBe(true);
    expect(isGood({ status: 200, ms: 1000 })).toBe(false);
    expect(isGood({ status: 503, ms: 10 })).toBe(false);
    expect(isGood({ status: 0, ms: null })).toBe(false);
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

describe("SLO 99,5 % за 30 дней: только страницы /ru и /kk", () => {
  it("всё зелёное — 100 %, бюджет цел, тревог нет", () => {
    const s = summarize(checks(2 * DAY), NOW);
    expect(s.overall).toMatchObject({ total: 4 * DAY, good: 4 * DAY, availability: 1 });
    expect(s.budget.remaining).toBe(1);
    expect(s.burn["1h"]).toBe(0);
    expect(s.alerting).toBe(false);
  });

  it("/api/health/ready — диагностика: его сбои бюджет не тратят", () => {
    const s = summarize(checks(2 * DAY, (_, t) => t === "/api/health/ready"), NOW);
    expect(s.overall.availability).toBe(1);
    expect(s.byTarget["/api/health/ready"]).toMatchObject({ slo: false, availability: 0 });
    expect(s.alerting).toBe(false);
  });

  it("ошибки ровно на бюджет (0,5 %) — остаток 0, burn 30 дней = 1", () => {
    // 10 дней: 5760 проверок страниц, 0,5 % = 28,8 → 29 ошибок давно, вне последних суток
    const all = checks(10 * DAY);
    const bad = new Set(all.filter((c) => c.target !== "/api/health/ready").slice(-29).map((c) => `${c.target} ${c.t}`));
    const s = summarize(all.map((c) => (bad.has(`${c.target} ${c.t}`) ? { ...c, status: 0, ms: null } : c)), NOW);
    expect(s.budget.errors).toBe(29);
    expect(s.budget.remaining).toBeCloseTo(1 - 29 / 28.8);
    expect(s.alerts.fastBurn.firing).toBe(false);
  });

  it("проверки старше 30 дней не считаются", () => {
    const old = check(31 * 24 * 60, "/ru", 503, 50);
    expect(summarize([...checks(10), old], NOW).overall.total).toBe(20);
  });

  it("нет данных — без деления на ноль, но тревога «данные устарели»", () => {
    const s = summarize([], NOW);
    expect(s.overall.availability).toBeNull();
    expect(s.budget.remaining).toBe(1);
    expect(s.burn["1h"]).toBeNull();
    expect(s.alerts.stale.firing).toBe(true);
  });
});

describe("тревоги под 12 проверок в час", () => {
  it("быстрое выгорание: две неуспешные проверки страниц за час (из 24) — тревога", () => {
    const s = summarize(checks(2 * DAY, (i, t) => t === "/ru" && (i === 30 || i === 31)), NOW);
    expect(s.alerts.fastBurn.worst).toBeGreaterThanOrEqual(14.4);
    expect(s.alerts.fastBurn.firing).toBe(true);
    expect(s.alerting).toBe(true);
  });

  it("одна неуспешная проверка за час — не тревога (burn ~8)", () => {
    const s = summarize(checks(2 * DAY, (i, t) => t === "/kk" && i === 30), NOW);
    expect(s.alerts.fastBurn.firing).toBe(false);
    expect(s.alerts.slowBurn.firing).toBe(false);
  });

  it("медленное выгорание: 5 сбоев за 6 часов, не больше одного в час", () => {
    const s = summarize(checks(2 * DAY, (i, t) => t === "/ru" && [10, 24, 38, 52, 66].includes(i)), NOW);
    expect(s.alerts.fastBurn.firing).toBe(false);
    expect(s.alerts.slowBurn.firing).toBe(true);
  });

  it("сбой больше суток назад — тревоги нет (отчёт смотрит окна последних суток)", () => {
    const s = summarize(checks(3 * DAY, (i) => i > DAY + 20 && i < DAY + 40), NOW);
    expect(s.alerts.fastBurn.firing).toBe(false);
  });

  it("дырявые данные — burn за окно не считается", () => {
    // Каждая пятая проверка: в часе 2–3 проверки на адрес вместо 12
    const sparse = checks(2 * DAY, (i, t) => t === "/ru" && i < 12).filter((_, i) => Math.floor(i / 3) % 5 === 0);
    const s = summarize(sparse, NOW);
    expect(s.alerts.fastBurn.worst).toBeNull();
    expect(s.alerts.fastBurn.firing).toBe(false);
  });
});

describe("мониторинг мониторинга", () => {
  it(`за сутки меньше ${MIN_DAILY_CHECKS} проверок адреса — тревога`, () => {
    const s = summarize(checks(DAY - 40), NOW);
    expect(s.alerts.lowCoverage.firing).toBe(true);
    expect(s.alerts.lowCoverage.targets.map((x: { target: string }) => x.target)).toEqual(["/ru", "/kk", "/api/health/ready"]);
    expect(summarize(checks(DAY), NOW).alerts.lowCoverage.firing).toBe(false);
  });

  it("последняя проверка старше 2 часов — тревога «данные устарели»", () => {
    const shifted = checks(DAY).map((c) => ({ ...c, t: new Date(Date.parse(c.t) - 3 * 3_600_000).toISOString() }));
    const s = summarize(shifted, NOW);
    expect(s.alerts.stale).toMatchObject({ firing: true, ageMin: 180 });
  });
});

describe("холодный старт — отдельный SLI", () => {
  it("только запросы с X-Cold-Start: 1; цель — быстрее 1,5 с", () => {
    const rows = [
      { t: at(60), coldStart: "1", status: 200, ms: 900 },
      { t: at(50), coldStart: "1", status: 200, ms: 1700 },
      { t: at(40), coldStart: "0", status: 200, ms: 200 },
      { t: at(40 * 24 * 60), coldStart: "1", status: 200, ms: 5000 },
    ];
    expect(summarizeColdStarts(rows, NOW)).toMatchObject({ measured: 3, cold: 2, notCold: 1, good: 1, share: 0.5, max: 1700 });
    expect(summarize([], NOW, rows).coldStart).toMatchObject({ latencyMs: 1500, target: 0.9, cold: 2 });
  });
});
