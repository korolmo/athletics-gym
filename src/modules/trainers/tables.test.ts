import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Тренеры по данным (этап 6, ADR 0015): Тренер и Плакат Тренера. Тарифы Тренера переносит через moveTrainerTariffs модуля Тарифы.
const OWN = ["trainer"];

describe("модуль Тренеры: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
