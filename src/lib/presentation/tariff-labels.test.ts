import { describe, expect, it } from "vitest";
import type { TariffShape } from "@/lib/domain/tariff";
import { formatNumber, formatPrice, formatTariffPrice, plural, tariffLabelRu, tariffTagsRu } from "./tariff-labels";

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
