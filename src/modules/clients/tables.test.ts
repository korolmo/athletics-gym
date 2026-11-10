import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Клиенты по данным (этап 1, ADR 0015, 0016): аккаунт Клиента и коды входа.
const OWN = ["client", "clientLoginCode"];

describe("модуль Клиенты: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
