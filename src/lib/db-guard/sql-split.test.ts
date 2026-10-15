import fs from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { splitSql } = require("../../../scripts/standalone/sql-split.cjs") as { splitSql: (sql: string) => string[] };

describe("разбор SQL миграции на запросы", () => {
  it("делит по точке с запятой, комментарии убирает", () => {
    const sql = "-- CreateTable\nCREATE TABLE `A` (`id` INT);\n\n/* блок */\nCREATE INDEX `i` ON `A`(`id`);\n";
    expect(splitSql(sql)).toEqual(["CREATE TABLE `A` (`id` INT)", "CREATE INDEX `i` ON `A`(`id`)"]);
  });

  it("точка с запятой внутри строк и имён запрос не делит", () => {
    const sql = "INSERT INTO `T` (`a;b`, `c`) VALUES ('x; y', 'it''s; ok', \"q;\", 'back\\'; z');\nSELECT 1;";
    expect(splitSql(sql)).toEqual(["INSERT INTO `T` (`a;b`, `c`) VALUES ('x; y', 'it''s; ok', \"q;\", 'back\\'; z')", "SELECT 1"]);
  });

  it("пустые запросы и хвост без точки с запятой", () => {
    expect(splitSql(";;  ;\nSELECT 2")).toEqual(["SELECT 2"]);
    expect(splitSql("-- только комментарий\n")).toEqual([]);
  });

  it("базовая миграция MariaDB делится на CREATE TABLE и ALTER TABLE", () => {
    const sql = fs.readFileSync("prisma/migrations/20261015000000_init_mariadb/migration.sql", "utf8");
    const parts = splitSql(sql);
    expect(parts.length).toBeGreaterThan(10);
    expect(parts.every((p) => /^(CREATE|ALTER)\b/.test(p))).toBe(true);
  });
});
