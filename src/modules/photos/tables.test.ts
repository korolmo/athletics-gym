import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Фото по данным (этап 6, ADR 0015). Фото должно трогать только свою таблицу — Галерею.
// Пока оно ещё ведёт места для Фото у сущностей, не перенесённых в модули; каждый PR модуля-владельца
// забирает своё место (PhotoSlot) и вычёркивает таблицу отсюда. Тест падает и когда появилась новая чужая
// таблица, и когда старая ушла, а список не поправили.
const OWN = ["galleryPhoto"];
const FOREIGN_UNTIL_OWNER_MOVES = {
  siteSettings: "Сайт — Фото первого экрана и Женского зала",
};

describe("модуль Фото: таблицы базы", () => {
  it("трогает только свою таблицу и чужие из списка «до переноса владельца»", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    expect(tablesUsedBy(dir)).toEqual([...OWN, ...Object.keys(FOREIGN_UNTIL_OWNER_MOVES)].sort());
  });
});
