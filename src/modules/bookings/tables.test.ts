import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Записи по данным (этап 1, ADR 0015, 0017): только Записи. Строку Клиента блокирует модуль Клиенты
// (lockClient), Тренера и Окна читают их модули.
const OWN = ["booking"];

describe("модуль Записи: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
