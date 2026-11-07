import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Фото по данным (этап 6, ADR 0015): своя таблица — только Галерея. Места для Фото у Залов,
// Тренеров, Направлений и в Настройках сайта ведут их модули (PhotoSlot); чужих таблиц у Фото нет.
const OWN = ["galleryPhoto"];

describe("модуль Фото: таблицы базы", () => {
  it("трогает только свою таблицу — Галерею", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
