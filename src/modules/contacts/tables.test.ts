import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Обращения по данным (этап 6, ADR 0015): только счётчик нажатий на кнопки связи.
const OWN = ["contactClick"];

describe("модуль Обращения: таблицы базы", () => {
  it("трогает только свою таблицу", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
