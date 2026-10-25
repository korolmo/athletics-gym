import { describe, expect, it } from "vitest";
import { attemptPhases, summarizeProbe } from "./tidb-probe-core.mjs";

describe("замер подключения к TiDB", () => {
  it("фазы — от предыдущей пройденной; оборванное подключение — до последней пройденной", () => {
    expect(attemptPhases({ t0: 0, dns: 10, tcp: 110, greeting: 111, tls: 230, auth: 4430, query: 4520 })).toEqual({
      dns: 10, tcp: 100, greeting: 1, tls: 119, auth: 4200, query: 90, total: 4520,
    });
    expect(attemptPhases({ t0: 0, dns: 5, tcp: 50 })).toEqual({ dns: 5, tcp: 45, total: 50 });
  });

  it("сводка: медиана и максимум по виду подключения, сбои отдельно", () => {
    const s = summarizeProbe([
      { kind: "cold", ok: true, auth: 4000, total: 4500 },
      { kind: "cold", ok: true, auth: 3000, total: 3600 },
      { kind: "cold", ok: false, failedAt: "auth", auth: 9000 },
      { kind: "warm", ok: true, auth: 200, total: 480 },
    ]);
    expect(s.cold).toMatchObject({ n: 3, failed: 1 });
    expect(s.cold.phases.auth).toEqual({ median: 3000, max: 4000 });
    expect(s.warm.phases.total).toEqual({ median: 480, max: 480 });
    expect(s.parallel.n).toBe(0);
  });
});
