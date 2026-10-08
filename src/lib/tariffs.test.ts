import { describe, expect, it } from "vitest";
import {
  CATEGORY_FIELDS,
  CATEGORY_ORDER,
  HALL_CATEGORIES,
  formatNumber,
  formatPrice,
  formatTariffPrice,
  isAccess,
  isAudience,
  isCategory,
  isHall,
  plural,
  tariffLabelRu,
  tariffTagsRu,
  type TariffShape,
} from "./tariffs";

// Intl ставит между разрядами неразрывный пробел — в тестах сравниваем с обычным
const plain = (s: string) => s.replace(/[  ]/g, " ");

const tariff = (over: Partial<TariffShape>): TariffShape => ({
  category: "VISITS",
  titleRu: null,
  titleKk: null,
  visitsPerMonth: null,
  durationMonths: null,
  access: "FULL",
  audience: "ALL",
  price: 10000,
  priceTo: null,
  ...over,
});

describe("plural", () => {
  const months = ["месяц", "месяца", "месяцев"];
  it.each([
    [1, "месяц"],
    [2, "месяца"],
    [4, "месяца"],
    [5, "месяцев"],
    [11, "месяцев"],
    [12, "месяцев"],
    [14, "месяцев"],
    [21, "месяц"],
    [22, "месяца"],
    [25, "месяцев"],
    [101, "месяц"],
    [111, "месяцев"],
  ])("%i → %s", (n, expected) => {
    expect(plural(n, months)).toBe(expected);
  });

  it("с одной формой (казахский) всегда возвращает её", () => {
    expect(plural(5, ["ай"])).toBe("ай");
    expect(plural(1, ["ай"])).toBe("ай");
  });

  it("без форм возвращает пустую строку", () => {
    expect(plural(3, [])).toBe("");
  });
});

describe("форматирование цен", () => {
  it("разделяет разряды и добавляет знак тенге", () => {
    expect(plain(formatNumber(140000))).toBe("140 000");
    expect(plain(formatPrice(9000))).toBe("9 000 ₸");
    expect(plain(formatPrice(0))).toBe("0 ₸");
  });

  it("точная цена — без диапазона", () => {
    expect(plain(formatTariffPrice({ price: 20000, priceTo: null }))).toBe("20 000 ₸");
  });

  it("диапазон «от–до»", () => {
    expect(plain(formatTariffPrice({ price: 15000, priceTo: 25000 }))).toBe("15 000 – 25 000 ₸");
  });

  it("«до» не больше цены — диапазоном не считается", () => {
    expect(plain(formatTariffPrice({ price: 15000, priceTo: 15000 }))).toBe("15 000 ₸");
    expect(plain(formatTariffPrice({ price: 15000, priceTo: 100 }))).toBe("15 000 ₸");
  });
});

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

describe("название Тарифа для админки", () => {
  it("уточнение важнее собранного названия", () => {
    expect(tariffLabelRu(tariff({ category: "PERSONAL", titleRu: "1+1 (подходит для подруг)", visitsPerMonth: 12 }))).toBe(
      "1+1 (подходит для подруг)",
    );
  });

  it("по Категориям", () => {
    expect(tariffLabelRu(tariff({ category: "SINGLE" }))).toBe("Разовое посещение");
    expect(tariffLabelRu(tariff({ category: "VISITS", visitsPerMonth: 12 }))).toBe("12 посещений в месяц");
    expect(tariffLabelRu(tariff({ category: "UNLIMITED", durationMonths: 3 }))).toBe("Безлимит, 3 месяца");
    expect(tariffLabelRu(tariff({ category: "PERSONAL", visitsPerMonth: 12 }))).toBe("12 тренировок в месяц");
    expect(tariffLabelRu(tariff({ category: "PERSONAL", visitsPerMonth: null }))).toBe("Разовая тренировка");
  });

  it("пометки: Аудитория — кроме «всем», Время доступа — только у абонемента на посещения", () => {
    expect(tariffTagsRu(tariff({ category: "VISITS", audience: "STUDENTS", access: "DAY" }))).toEqual([
      "Студентам",
      "Дневной (08:00–17:00)",
    ]);
    expect(tariffTagsRu(tariff({ category: "VISITS", audience: "ALL", access: "FULL" }))).toEqual(["Весь день (08:00–23:00)"]);
    expect(tariffTagsRu(tariff({ category: "PERSONAL", audience: "MEN", access: "FULL" }))).toEqual(["Мужчинам"]);
    expect(tariffTagsRu(tariff({ category: "UNLIMITED" }))).toEqual([]);
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
