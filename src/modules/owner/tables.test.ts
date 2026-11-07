import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { tablesUsedBy } from "@/lib/testing/module-tables";

// Граница модуля Аккаунт Владельца по данным (этап 6, ADR 0015): аккаунт и попытки входа.
const OWN = ["loginAttempt", "owner"];

describe("модуль Аккаунт Владельца: таблицы базы", () => {
  it("трогает только свои таблицы", () => {
    expect(tablesUsedBy(path.dirname(fileURLToPath(import.meta.url)))).toEqual(OWN);
  });
});
