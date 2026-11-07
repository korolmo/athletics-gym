import { describe, expect, it } from "vitest";
import { CATEGORY_FIELDS, CATEGORY_ORDER, HALL_CATEGORIES, isAccess, isAudience, isCategory, isHall } from "./tariff";

describe("правила Категорий", () => {
  it("у каждой Категории описан набор полей", () => {
    for (const c of CATEGORY_ORDER) expect(CATEGORY_FIELDS[c]).toBeDefined();
  });

  it("разовое посещение — только цена", () => {
    expect(Object.values(CATEGORY_FIELDS.SINGLE).every((v) => v === false)).toBe(true);
  });

  it("абонемент на посещения — число посещений, Время доступа, Аудитория", () => {
    expect(CATEGORY_FIELDS.VISITS).toMatchObject({ visits: true, access: true, audience: true, months: false, trainer: false, priceTo: false });
  });

  it("безлимит — только срок в месяцах", () => {
    expect(CATEGORY_FIELDS.UNLIMITED).toMatchObject({ months: true, visits: false, access: false, audience: false });
  });

  it("персональная — Тренер, уточнение, диапазон цены; без Времени доступа", () => {
    expect(CATEGORY_FIELDS.PERSONAL).toMatchObject({ trainer: true, title: true, priceTo: true, access: false, months: false });
  });

  it("в прайсе Зала нет персональных: они только у Тренеров", () => {
    expect([...HALL_CATEGORIES]).toEqual(["SINGLE", "VISITS", "UNLIMITED"]);
    expect(HALL_CATEGORIES.every((c) => !CATEGORY_FIELDS[c].trainer)).toBe(true);
  });
});

describe("белые списки значений", () => {
  it("принимают только известные значения", () => {
    expect(isHall("general") && isHall("women")).toBe(true);
    expect(isHall("vip")).toBe(false);
    expect(isCategory("UNLIMITED")).toBe(true);
    expect(isCategory("MONTHLY")).toBe(false);
    expect(isAccess("DAY") && isAccess("FULL")).toBe(true);
    expect(isAccess("NIGHT")).toBe(false);
    expect(isAudience("STUDENTS")).toBe(true);
    expect(isAudience("")).toBe(false);
  });
});
