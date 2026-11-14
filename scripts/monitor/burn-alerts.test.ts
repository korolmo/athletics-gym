import { describe, expect, it } from "vitest";
import { alertThreshold, currentBurn, evaluateBurn } from "./burn-alerts.mjs";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const MIN = 60_000;

/** Проверки /ru и /kk каждые 5 минут за `hours` до NOW; bad(i) — номер проверки неуспешен. */
function checks(hours: number, bad: (i: number, target: string) => boolean = () => false) {
  const out = [];
  let i = 0;
  for (let t = NOW - hours * 60 * MIN + 5 * MIN; t <= NOW; t += 5 * MIN) {
    for (const target of ["/ru", "/kk"]) {
      const fail = bad(i, target);
      out.push({ t: new Date(t).toISOString(), target, status: fail ? 500 : 200, ms: fail ? null : 300 });
    }
    i++;
  }
  return out;
}

describe("выгорание бюджета сейчас (ADR 0028)", () => {
  it("без ошибок — burn 0, тревог нет, не слепы", () => {
    const r = evaluateBurn(checks(7), NOW);
    expect(r.burns).toEqual({ fastBurn: 0, slowBurn: 0 });
    expect(r.firing).toEqual([]);
    expect(r.blind).toBe(false);
  });

  it("2 неуспешные из 24 за последний час — быстрое выгорание (как в ADR 0014)", () => {
    const c = checks(7, (i, target) => target === "/ru" && (i === 80 || i === 81));
    const r = evaluateBurn(c, NOW);
    expect(r.burns.fastBurn).toBeCloseTo(2 / 24 / 0.005, 5);
    expect(r.firing).toContain("fastBurn");
  });

  it("5 неуспешных за 6 часов, но не в последний час — только медленное", () => {
    const c = checks(7, (i, target) => target === "/kk" && i >= 20 && i < 25);
    const r = evaluateBurn(c, NOW);
    expect(r.firing).toEqual(["slowBurn"]);
  });

  it("старые ошибки за пределами окна не считаются", () => {
    const c = checks(7, (i) => i < 5);
    expect(evaluateBurn(c, NOW).firing).toEqual([]);
  });

  it("медленный ответ бюджет доступности не тратит — его мерит SLO скорости (поправка 13 ноября)", () => {
    const c = checks(1).map((x, i) => (i < 2 ? { ...x, ms: 1500 } : x));
    expect(currentBurn(c, 60 * MIN, NOW)).toBe(0);
  });

  it("данных меньше 75 % — окно не считается; оба окна пустые — «мониторинг слеп»", () => {
    const half = checks(7).filter((_, i) => i % 2 === 0);
    expect(currentBurn(half, 60 * MIN, NOW)).toBeNull();
    const r = evaluateBurn([], NOW);
    expect(r.blind).toBe(true);
    expect(r.firing).toEqual([]);
  });

  it("API не ответил — слепота, даже если старые проверки есть", () => {
    expect(evaluateBurn(checks(7), NOW, true).blind).toBe(true);
  });

  it("диагностика /api/health/ready бюджет не тратит", () => {
    const c = [...checks(7), ...checks(7).map((x) => ({ ...x, target: "/api/health/ready", status: 503, ms: null }))];
    expect(evaluateBurn(c, NOW).firing).toEqual([]);
  });

  it("пороги — из ADR 0014", () => {
    expect(alertThreshold("fastBurn")).toBe(14.4);
    expect(alertThreshold("slowBurn")).toBe(6);
  });
});
