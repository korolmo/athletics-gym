import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Демо по данным (этап П1): только своя таблица; чужие — через снимок и возврат модулей-хозяев.
describe("модуль Демо: таблицы базы", () => {
  it("трогает только свою таблицу", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(["demoState"]);
  });
});
