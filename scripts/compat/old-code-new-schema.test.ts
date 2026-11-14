import { describe, expect, it } from "vitest";
import { PAGES, assertLocal, verdict } from "./old-code-new-schema.mjs";

describe("прежний код на новой схеме (ADR 0022)", () => {
  it("коды 2xx–4xx — совместимо; сводка кодов", () => {
    const v = verdict([
      { path: "/ru", status: 200 },
      { path: "/ru/nope", status: 404 },
      { path: "/ru/cabinet", status: 307 },
      { path: "/api/health/ready", status: 200 },
    ]);
    expect(v.ok).toBe(true);
    expect(v.codes).toEqual({ 200: 2, 404: 1, 307: 1 });
  });

  it("5xx и обрыв — не совместимо, повторы схлопываются", () => {
    const v = verdict([
      { path: "/ru", status: 500 },
      { path: "/ru", status: 500 },
      { path: "/kk", status: null, error: "socket hang up" },
    ]);
    expect(v.ok).toBe(false);
    expect(v.problems).toEqual(["/ru: 500", "/kk: обрыв — socket hang up"]);
  });

  it("база не готова для прежнего кода — не совместимо, даже без 5xx", () => {
    expect(verdict([{ path: "/api/health/ready", status: 503 }]).ok).toBe(false);
  });

  it("только локальный адрес", () => {
    expect(assertLocal("http://127.0.0.1:3200/")).toBe("http://127.0.0.1:3200");
    expect(() => assertLocal("https://athleticsgym.kz")).toThrow();
    expect(() => assertLocal("https://athletics-gym-lab.vercel.app")).toThrow();
  });

  it("обход читает базу: главная, кабинет, проверка готовности", () => {
    for (const p of ["/ru", "/ru/cabinet/login", "/api/health/ready"]) expect(PAGES).toContain(p);
  });
});
