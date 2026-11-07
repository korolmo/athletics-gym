import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Направления по данным (этап 6, ADR 0015): Направления и их Фото (Direction.photo).
const OWN = ["direction"];

describe("модуль Направления: таблицы базы", () => {
  it("трогает только свою таблицу", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
