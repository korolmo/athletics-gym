import { describe, expect, it } from "vitest";
import { FORCE_PRODUCTION_FLAG, decideSeed, isProductionDatabaseUrl } from "./production";

const REF = "vrvupsqjhyhghgikboif";
const prodPooler = `postgresql://postgres.${REF}:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
const prodSession = `postgresql://postgres.${REF}:secret@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`;
const prodDirect = `postgresql://postgres:secret@db.${REF}.supabase.co:5432/postgres`;
const tokyo = "postgresql://postgres.abcdefghijklmnopqrst:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";
const otherFrankfurt = "postgresql://postgres.zzzzzzzzzzzzzzzzzzzz:secret@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";
const local = "postgresql://postgres:postgres@localhost:54329/gym";

describe("боевая база по строке подключения", () => {
  it("узнаёт боевую: пулер (оба порта) и прямое подключение", () => {
    expect(isProductionDatabaseUrl(prodPooler)).toBe(true);
    expect(isProductionDatabaseUrl(prodSession)).toBe(true);
    expect(isProductionDatabaseUrl(prodDirect)).toBe(true);
  });

  it("регистр и схема postgres:// не мешают", () => {
    expect(isProductionDatabaseUrl(prodSession.replace("postgresql://", "postgres://").replace(REF, REF.toUpperCase()))).toBe(true);
  });

  it("другие базы — не боевые: локальная, Токио, другой проект во Франкфурте", () => {
    expect(isProductionDatabaseUrl(local)).toBe(false);
    expect(isProductionDatabaseUrl(tokyo)).toBe(false);
    expect(isProductionDatabaseUrl(otherFrankfurt)).toBe(false);
  });

  it("тот же проект в другом регионе пулера боевым не считается", () => {
    expect(isProductionDatabaseUrl(`postgresql://postgres.${REF}:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`)).toBe(false);
  });

  it("пустая или битая строка — не боевая", () => {
    expect(isProductionDatabaseUrl(undefined)).toBe(false);
    expect(isProductionDatabaseUrl("")).toBe(false);
    expect(isProductionDatabaseUrl("not a url")).toBe(false);
  });
});

describe("решение о запуске seed", () => {
  it("на локальной и тестовой базе — можно, флаг не нужен", () => {
    expect(decideSeed({ DATABASE_URL: local, DIRECT_URL: local }, [])).toEqual({ allowed: true, production: false });
    expect(decideSeed({ DATABASE_URL: tokyo, DIRECT_URL: tokyo }, [])).toEqual({ allowed: true, production: false });
  });

  it("на боевой базе без флага — отказ с объяснением", () => {
    const d = decideSeed({ DATABASE_URL: prodPooler, DIRECT_URL: prodSession }, []);
    expect(d.allowed).toBe(false);
    expect(!d.allowed && d.reason).toContain("боевую базу");
    expect(!d.allowed && d.reason).toContain(FORCE_PRODUCTION_FLAG);
  });

  it("достаточно, чтобы на боевую указывала одна из двух строк", () => {
    expect(decideSeed({ DATABASE_URL: local, DIRECT_URL: prodSession }, []).allowed).toBe(false);
    expect(decideSeed({ DATABASE_URL: prodPooler, DIRECT_URL: local }, []).allowed).toBe(false);
    expect(decideSeed({ DIRECT_URL: prodDirect }, []).allowed).toBe(false);
  });

  it("с флагом --force-production — можно, и это помечено как боевая", () => {
    expect(decideSeed({ DATABASE_URL: prodPooler, DIRECT_URL: prodSession }, ["node", "seed.ts", FORCE_PRODUCTION_FLAG])).toEqual({
      allowed: true,
      production: true,
    });
  });

  it("похожий, но другой флаг не подходит", () => {
    expect(decideSeed({ DATABASE_URL: prodPooler }, ["--force", "--production", "--force-production=no"]).allowed).toBe(false);
  });
});
