import { describe, expect, it } from "vitest";
import { PREVIEW_DB_LIMIT, databasesToDrop, isPreviewDbName, previewDbName, withDatabase } from "./preview-db-core.mjs";

const URL_ = "mysql://user.root:secret@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/athletics?sslaccept=strict";

describe("имя базы превью", () => {
  it("pr_<номер>", () => {
    expect(previewDbName(48)).toBe("pr_48");
    expect(previewDbName(" 7 ")).toBe("pr_7");
  });

  it.each(["", "0", "-1", "48; DROP DATABASE athletics", "abc", "1e3"])("«%s» — отказ", (n) => {
    expect(() => previewDbName(n)).toThrow();
  });

  it("production Лаборатории и чужие базы — не базы превью", () => {
    for (const name of ["athletics", "mysql", "pr_", "pr_01", "pr_1_x", "PR_1", "information_schema"]) expect(isPreviewDbName(name)).toBe(false);
    expect(isPreviewDbName("pr_123")).toBe(true);
  });
});

describe("адрес базы превью", () => {
  it("меняется только база, параметры TLS сохраняются", () => {
    const u = new URL(withDatabase(URL_, "pr_48"));
    expect(u.pathname).toBe("/pr_48");
    expect(u.searchParams.get("sslaccept")).toBe("strict");
    expect(u.host).toBe("gateway01.eu-central-1.prod.aws.tidbcloud.com:4000");
  });

  it("на базу production Лаборатории адрес не строится", () => {
    expect(() => withDatabase(URL_, "athletics")).toThrow(/Отказ/);
  });
});

describe("лимит баз превью", () => {
  const at = (day: number) => new Date(Date.UTC(2026, 9, day));
  const many = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `pr_${100 + i}`, createdAt: at(i + 1) }));

  it("меньше лимита — ничего не удаляем", () => {
    expect(databasesToDrop(many(PREVIEW_DB_LIMIT - 1), "pr_999")).toEqual([]);
  });

  it("новая база сверх лимита — удаляется самая старая", () => {
    expect(databasesToDrop(many(PREVIEW_DB_LIMIT), "pr_999")).toEqual(["pr_100"]);
  });

  it("пересоздание существующей базы лимит не превышает", () => {
    expect(databasesToDrop(many(PREVIEW_DB_LIMIT), "pr_105")).toEqual([]);
  });

  it("недосозданная база без даты — первая на удаление; production и чужие базы — никогда", () => {
    const list = [...many(PREVIEW_DB_LIMIT), { name: "pr_50", createdAt: null }, { name: "athletics", createdAt: at(1) }];
    expect(databasesToDrop(list, "pr_999")).toEqual(["pr_50", "pr_100"]);
  });
});
