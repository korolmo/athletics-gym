import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Тарифы по данным (этап 6, ADR 0015): Залы, Тарифы и Плакат прайса. О Тренерах не знает: Зал Тренера ему передают (TrainerHallLookup).
const OWN = ["hall", "tariff"];

describe("модуль Тарифы: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
