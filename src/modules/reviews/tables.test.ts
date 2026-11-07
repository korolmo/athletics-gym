import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Отзывы по данным (этап 6, ADR 0015): Отзывы и записи об отправке формы (антиспам).
const OWN = ["review", "reviewSubmission"];

describe("модуль Отзывы: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
