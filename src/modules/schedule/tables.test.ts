import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Окна Тренера по данным (этап 1, ADR 0015, 0017): длительность, часы работы, исключения.
// Таблицу Тренера модуль не трогает — связь только внешним ключом.
const OWN = ["trainerSchedule", "trainerTimeOff", "trainerWorkHours"];

describe("модуль Окна Тренера: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
