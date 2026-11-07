import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Главная по данным (этап 6, ADR 0015): своих таблиц нет, в чужие не ходит — только через модули.
describe("модуль Главная: таблицы базы", () => {
  it("не трогает ни одной таблицы напрямую", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual([]);
  });
});
