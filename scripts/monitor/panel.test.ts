import { describe, expect, it } from "vitest";
import { alertEpisodes, burnChartSvg, burnSeries, postmortemsFromReadme } from "./panel.mjs";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-11-13T18:00:00Z");

/** Проверки /ru и /kk каждые 5 минут за `hours` до NOW; bad(ts) — неуспешна. */
function checks(hours: number, bad: (ts: number) => boolean = () => false) {
  const out = [];
  for (let t = NOW - hours * HOUR + 5 * 60_000; t <= NOW; t += 5 * 60_000) {
    for (const target of ["/ru", "/kk"]) out.push({ t: new Date(t).toISOString(), target, status: 200, ms: bad(t) ? 2100 : 300 });
  }
  return out;
}

describe("SLO-панель", () => {
  it("ряд burn по часам: окно 1 ч и 6 ч; без данных — null", () => {
    const s = burnSeries(checks(10), NOW, 12);
    expect(s).toHaveLength(12);
    expect(s.at(-1)).toEqual({ t: NOW, fast: 0, slow: 0 });
    expect(s[0].fast).toBeNull();
  });

  it("эпизод тревоги — подряд идущие часы выше порога, с худшим значением", () => {
    // Медленные проверки 15:35, 15:40, 15:45 на /ru и /kk — 6 из 24 за час (burn 50) и 6 из 144 за 6 часов (8,3)
    const bad = (t: number) => t > NOW - 2.5 * HOUR && t <= NOW - 2.25 * HOUR;
    const ep = alertEpisodes(burnSeries(checks(10, bad), NOW, 10));
    const fast = ep.filter((e) => e.kind === "fastBurn");
    expect(fast).toHaveLength(1);
    expect(fast[0].worst).toBeGreaterThan(14.4);
    expect(ep.some((e) => e.kind === "slowBurn")).toBe(true);
  });

  it("без ошибок — ни одного эпизода", () => {
    expect(alertEpisodes(burnSeries(checks(10), NOW, 10))).toEqual([]);
  });

  it("постмортемы — из таблицы README, статус без выделения", () => {
    const md = [
      "| Дата | Разбор | Статус |",
      "|---|---|---|",
      "| 25 октября 2026 | [Невалидный замер](./2026-10-25-a.md) | закрыт |",
      "| 13 ноября 2026 | [Медленные страницы](./2026-11-13-b.md) | **открыт** |",
    ].join("\n");
    expect(postmortemsFromReadme(md)).toEqual([
      { date: "25 октября 2026", title: "Невалидный замер", file: "2026-10-25-a.md", status: "закрыт" },
      { date: "13 ноября 2026", title: "Медленные страницы", file: "2026-11-13-b.md", status: "открыт" },
    ]);
  });

  it("график — SVG с двумя линиями и порогами; пустой ряд — пусто", () => {
    const svg = burnChartSvg(burnSeries(checks(30), NOW, 30));
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('class="fast"');
    expect(svg).toContain(">14,4<");
    expect(burnChartSvg([])).toBe("");
  });
});
