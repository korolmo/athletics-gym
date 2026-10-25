import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { HOME_KEYWORD, NAME_PREFIX, desiredMonitors, mergeChecks, monitorChecks, monitorParams, planMonitors } from "./uptimerobot-core.mjs";

const BASE = "https://athletics-gym-lab.vercel.app";

describe("мониторы UptimeRobot из репозитория", () => {
  it("страницы — с ключевым словом первого экрана, readiness — по коду; каждые 5 минут", () => {
    const d = desiredMonitors(BASE + "/");
    expect(d.map((m) => m.url)).toEqual([`${BASE}/ru`, `${BASE}/kk`, `${BASE}/api/health/ready`]);
    expect(d[0]).toMatchObject({ type: 2, keyword_type: 2, keyword_value: HOME_KEYWORD, interval: 300 });
    expect(d[2]).toMatchObject({ type: 1, interval: 300 });
    expect(d[2]).not.toHaveProperty("keyword_value");
  });

  it("ключевое слово есть в первом экране главной (его нельзя скрыть) и нет на страницах ошибок", () => {
    expect(fs.readFileSync("src/components/site/sections/Hero.tsx", "utf8")).toContain(HOME_KEYWORD);
    for (const f of ["src/components/site/errors/NotFoundView.tsx", "src/lib/errors/offline-page.ts", "src/pages/500.tsx"]) {
      expect(fs.readFileSync(f, "utf8"), f).not.toContain(HOME_KEYWORD);
    }
  });

  it("боевой сайт не добавляется", () => {
    expect(() => desiredMonitors("https://athleticsgym.kz")).toThrow(/Отказ/);
  });

  it("сверка идемпотентна: создать недостающие, поправить отличающиеся, чужие не трогать", () => {
    const d = desiredMonitors(BASE);
    const existing = [
      { id: 1, url: `${BASE}/ru`, friendly_name: `${NAME_PREFIX} /ru`, type: 2, keyword_type: 2, keyword_value: HOME_KEYWORD, interval: 300 },
      { id: 2, url: `${BASE}/kk`, friendly_name: `${NAME_PREFIX} /kk`, type: 2, keyword_type: 2, keyword_value: HOME_KEYWORD, interval: 600 },
      { id: 3, url: "https://example.com", friendly_name: "чужой", type: 1, interval: 300 },
      { id: 4, url: `${BASE}/old`, friendly_name: `${NAME_PREFIX} /old`, type: 1, interval: 300 },
    ];
    const plan = planMonitors(existing, d);
    expect(plan.ok).toEqual([{ id: 1, target: "/ru" }]);
    expect(plan.update).toEqual([{ id: 2, target: "/kk", changes: { interval: 300 } }]);
    expect(plan.create.map((m) => m.target)).toEqual(["/api/health/ready"]);
    expect(plan.extra).toEqual([`${BASE}/old`]);
    // Всё как нужно — повторный запуск ничего не делает
    const after = planMonitors([...existing.slice(0, 1), { ...existing[1], interval: 300 }, { id: 5, ...d[2] }], d);
    expect(after.create).toEqual([]);
    expect(after.update).toEqual([]);
  });

  it("параметры запроса — без служебного target и без ключа", () => {
    const p = monitorParams(desiredMonitors(BASE)[0]);
    expect(p).toEqual({ friendly_name: `${NAME_PREFIX} /ru`, url: `${BASE}/ru`, type: "2", keyword_type: "2", keyword_value: HOME_KEYWORD, interval: "300" });
  });
});

describe("проверки из ответа API", () => {
  const T0 = Date.parse("2026-10-27T00:00:00Z") / 1000;
  it("время ответа — успешные проверки; падение из журнала — неуспешные по интервалу; внутри падения время не считаем", () => {
    const monitor = {
      interval: 300,
      response_times: [
        { datetime: T0, value: 250 },
        { datetime: T0 + 300, value: 1200 },
        { datetime: T0 + 900, value: 999 }, // внутри падения — не считаем
        { datetime: T0 + 1800, value: 300 },
      ],
      logs: [
        { type: 1, datetime: T0 + 600, duration: 900, reason: { code: "503", detail: "Service Unavailable" } },
        { type: 2, datetime: T0 + 1500, duration: 0 },
        { type: 1, datetime: T0 + 2400, duration: 300, reason: { code: "200000", detail: "Keyword Not Found" } },
      ],
    };
    const c = monitorChecks(monitor, "/ru", T0, T0 + 3600);
    expect(c.map((x) => [x.t.slice(11, 16), x.status, x.ms])).toEqual([
      ["00:00", 200, 250],
      ["00:05", 200, 1200],
      ["00:10", 503, null],
      ["00:15", 503, null],
      ["00:20", 503, null],
      ["00:30", 200, 300],
      ["00:40", 0, null],
    ]);
  });

  it("слияние: повторная выборка не дублирует проверки", () => {
    const a = [{ t: "2026-10-27T00:00:00.000Z", target: "/ru", status: 200, ms: 1 }];
    const b = [
      { t: "2026-10-27T00:00:00.000Z", target: "/ru", status: 200, ms: 2 },
      { t: "2026-10-27T00:00:00.000Z", target: "/kk", status: 200, ms: 3 },
    ];
    expect(mergeChecks(a, b).map((x) => [x.target, x.ms])).toEqual([["/kk", 3], ["/ru", 2]]);
  });
});
