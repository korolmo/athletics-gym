import { describe, expect, it } from "vitest";
import { FORCE_PRODUCTION_FLAG, decideSeed } from "./production";

describe("решение о запуске seed", () => {
  it("без APP_ENV=production — можно, флаг не нужен", () => {
    expect(decideSeed({}, [])).toEqual({ allowed: true, production: false });
    expect(decideSeed({ APP_ENV: "development" }, [])).toEqual({ allowed: true, production: false });
    expect(decideSeed({ APP_ENV: "lab" }, [])).toEqual({ allowed: true, production: false });
  });

  it("на хостинге (APP_ENV=production) без флага — отказ с объяснением", () => {
    const d = decideSeed({ APP_ENV: "production" }, []);
    expect(d.allowed).toBe(false);
    expect(!d.allowed && d.reason).toContain("боевая база");
    expect(!d.allowed && d.reason).toContain(FORCE_PRODUCTION_FLAG);
  });

  it("с флагом --force-production — можно, и это помечено как боевая", () => {
    expect(decideSeed({ APP_ENV: "production" }, ["node", "seed.ts", FORCE_PRODUCTION_FLAG])).toEqual({ allowed: true, production: true });
  });

  it("похожий, но другой флаг не подходит", () => {
    expect(decideSeed({ APP_ENV: "production" }, ["--force", "--production", "--force-production=no"]).allowed).toBe(false);
  });
});
