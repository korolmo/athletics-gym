import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Сайт по данным (этап 6, ADR 0015): Настройки сайта (с путями Фото первого экрана и Женского
// зала) и карточки «О зале».
const OWN = ["aboutCard", "siteSettings"];

describe("модуль Сайт: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
