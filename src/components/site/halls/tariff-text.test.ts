import { describe, expect, it } from "vitest";
import { ru } from "@/dictionaries/ru";
import { kk } from "@/dictionaries/kk";
import { tariffLabel, tariffTags } from "./tariff-text";
import type { TariffView } from "./types";

const view = (over: Partial<TariffView>): TariffView => ({
  id: "t1",
  hallId: "general",
  category: "VISITS",
  title: null,
  visitsPerMonth: null,
  durationMonths: null,
  access: "FULL",
  audience: "ALL",
  price: 10000,
  priceTo: null,
  ...over,
});

describe("название Тарифа на сайте", () => {
  it("по-русски — со склонением", () => {
    expect(tariffLabel(ru.prices, view({ category: "SINGLE" }))).toBe("Разовое посещение");
    expect(tariffLabel(ru.prices, view({ category: "VISITS", visitsPerMonth: 12 }))).toBe("12 посещений в месяц");
    expect(tariffLabel(ru.prices, view({ category: "VISITS", visitsPerMonth: 1 }))).toBe("1 посещение в месяц");
    expect(tariffLabel(ru.prices, view({ category: "UNLIMITED", durationMonths: 1 }))).toBe("1 месяц");
    expect(tariffLabel(ru.prices, view({ category: "UNLIMITED", durationMonths: 3 }))).toBe("3 месяца");
    expect(tariffLabel(ru.prices, view({ category: "UNLIMITED", durationMonths: 12 }))).toBe("12 месяцев");
    expect(tariffLabel(ru.prices, view({ category: "PERSONAL", visitsPerMonth: 12 }))).toBe("12 тренировок в месяц");
    expect(tariffLabel(ru.prices, view({ category: "PERSONAL" }))).toBe("Разовая тренировка");
  });

  it("по-казахски — свой порядок слов, одна форма", () => {
    expect(tariffLabel(kk.prices, view({ category: "VISITS", visitsPerMonth: 12 }))).toBe("айына 12 рет кіру");
    expect(tariffLabel(kk.prices, view({ category: "UNLIMITED", durationMonths: 6 }))).toBe("6 ай");
    expect(tariffLabel(kk.prices, view({ category: "PERSONAL", visitsPerMonth: 12 }))).toBe("айына 12 жаттығу");
    expect(tariffLabel(kk.prices, view({ category: "PERSONAL" }))).toBe("Бір реттік жаттығу");
  });

  it("уточнение показывается вместо собранного названия", () => {
    expect(tariffLabel(ru.prices, view({ category: "PERSONAL", visitsPerMonth: 12, title: "1+1 (подходит для подруг)" }))).toBe(
      "1+1 (подходит для подруг)",
    );
  });
});

describe("пометки Тарифа на сайте", () => {
  it("Аудитория — кроме «всем»; Время доступа — только у абонемента на посещения", () => {
    expect(tariffTags(ru.prices, view({ audience: "STUDENTS", access: "DAY" }))).toEqual(["Студентам", "Дневной (08:00–17:00)"]);
    expect(tariffTags(ru.prices, view({ audience: "ALL", access: "FULL" }))).toEqual(["Весь день (08:00–23:00)"]);
    expect(tariffTags(ru.prices, view({ category: "PERSONAL", audience: "WOMEN" }))).toEqual(["Женщинам"]);
    expect(tariffTags(ru.prices, view({ category: "UNLIMITED" }))).toEqual([]);
    expect(tariffTags(kk.prices, view({ audience: "MEN", access: "FULL" }))).toEqual(["Ерлерге", "Күні бойы (08:00–23:00)"]);
  });
});
