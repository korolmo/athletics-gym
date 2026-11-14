import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Измерение этапа П1 (решение 14): название и город Клуба — данные, в коде их нет. Считаем строки кода в src с
// названием («Athletic's», «ATHLETIC») и городом («Кызылорд…», «Қызылорд…») — кроме комментариев, тестов и начальных значений
// (они и есть данные, которые переносит миграция). Технические имена (athletics.accessLog, домен) — не бренд.
// До П1 (main, 10 ноября) таких строк было 42, после PR 2 — 0.

// С П2 (решение 14) и пояс Клуба: «Asia/Qyzylorda» — только в начальных значениях Клуба.
export const BRAND_PATTERN = /Athletic('|’|&apos;)s|Athletic Club|ATHLETIC|Кызылорд|Қызылорд|КЫЗЫЛОРД|ҚЫЗЫЛОРД|Qyzylorda/;

/** Файлы, где упоминание — начальное значение, а не текст в коде. */
const ALLOWED = new Set([
  "src/modules/club/domain/club.ts", // DEFAULT_CLUB — Athletic's Gym, как в миграции
  "src/modules/site/domain/site-settings.defaults.ts", // начальные Настройки сайта: адрес, Instagram
]);

const ROOT = path.resolve(__dirname, "..", "..");

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const isComment = (line: string) => /^\s*(\/\/|\/\*|\*|\{\s*\/\*)/.test(line);

export function brandMentions(): string[] {
  const out: string[] = [];
  for (const file of files(path.join(ROOT, "src"))) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (ALLOWED.has(rel)) continue;
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (!isComment(line) && BRAND_PATTERN.test(line)) out.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
  }
  return out;
}

describe("бренд Клуба — данные, а не код (этап П1)", () => {
  it("в коде нет названия и города Клуба", () => {
    expect(brandMentions()).toEqual([]);
  });
});
