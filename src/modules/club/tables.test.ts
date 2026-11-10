import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Клуб по данным (этап П1, ADR 0018): только своя таблица.
const OWN = ["club"];

describe("модуль Клуб: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
