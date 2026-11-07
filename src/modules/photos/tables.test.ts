import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Граница модуля Фото по данным (этап 6, ADR 0015). dependency-cruiser видит импорты, но не видит, в какие
// таблицы модуль пишет через общий клиент Prisma. Фото должно трогать только свою таблицу — Галерею.
// Сейчас оно ещё ведёт места для Фото у других сущностей; каждый PR модуля-владельца забирает своё место
// и вычёркивает таблицу отсюда. Тест падает и когда появилась новая чужая таблица, и когда старая ушла,
// а список не поправили.
const OWN = ["galleryPhoto"];
const FOREIGN_UNTIL_OWNER_MOVES = {
  siteSettings: "Сайт — Фото первого экрана и Женского зала",
  trainer: "Тренеры — Плакат Тренера",
  direction: "Направления — своё Фото Направления",
};

const dir = path.dirname(fileURLToPath(import.meta.url));

function sources(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(root, e.name);
    if (e.isDirectory()) return sources(full);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
  });
}

describe("модуль Фото: таблицы базы", () => {
  it("трогает только свою таблицу и чужие из списка «до переноса владельца»", () => {
    const used = new Set<string>();
    for (const file of sources(dir)) {
      for (const m of fs.readFileSync(file, "utf8").matchAll(/\bdb\.(?!\$)(\w+)\./g)) used.add(m[1]);
    }
    expect([...used].sort()).toEqual([...OWN, ...Object.keys(FOREIGN_UNTIL_OWNER_MOVES)].sort());
  });
});
