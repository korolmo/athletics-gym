import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_PAGES, isSitePage } from "./site-pages";

describe("страницы сайта внутри языка", () => {
  it("список совпадает с маршрутами в src/app/[locale] (иначе новая страница отдавала бы 404)", () => {
    const dir = path.join(process.cwd(), "src", "app", "[locale]");
    const routes = fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) => {
        // Папка-страница: privacy/page.tsx; файл-маршрут: opengraph-image.tsx; сам [...rest] — это и есть 404
        if (entry.isDirectory()) return entry.name.startsWith("[") ? [] : [`/${entry.name}`];
        const m = /^(opengraph-image|twitter-image|icon|apple-icon)\.tsx?$/.exec(entry.name);
        return m ? [`/${m[1]}`] : [];
      });
    expect([...SITE_PAGES].sort()).toEqual(["", ...routes].sort());
  });

  it("главная, документы и картинки превью — свои; остальное — нет", () => {
    for (const p of ["", "/", "/privacy", "/terms/", "/opengraph-image"]) expect(isSitePage(p)).toBe(true);
    for (const p of ["/abc", "/privacy/x", "/admin", "/PRIVACY"]) expect(isSitePage(p)).toBe(false);
  });
});
