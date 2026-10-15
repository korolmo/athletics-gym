// Проверка переноса (этап 8, шаг 5): дамп из transfer-out/ импортируется в отдельную локальную базу MariaDB
// (Docker, docker-compose.yml) — как его импортирует phpMyAdmin в Plesk, — и сверяется с боевой Supabase:
//   - число строк в каждой таблице;
//   - каждая строка — значение в значение (даты, булевы, списки бегущей строки);
//   - каждое Фото из базы есть в архиве вместе с уменьшенными копиями;
//   - наш скрипт миграций видит базовую миграцию применённой и ничего не меняет.
// Запуск: npm run transfer:verify (после npm run transfer:export). Боевая база только читается.
// Проверочная база — TRANSFER_CHECK_URL, по умолчанию mysql://root:root@localhost:3307/athletics_transfer.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { unzipSync } from "fflate";
import { photoFiles } from "../../src/lib/domain/photo";
import { DUMP_FILE, MANIFEST_FILE, PHOTO_COLUMNS, ZIP_FILE, loadSource, openSource, quoteName, tables } from "./common";

const require = createRequire(import.meta.url);
const { migrate, singleConnectionUrl } = require("../standalone/migrate.cjs") as {
  migrate: (o: { db: PrismaClient; dir: string; log?: (m: string) => void }) => Promise<string[]>;
  singleConnectionUrl: (url: string) => string;
};

const CHECK_URL = process.env.TRANSFER_CHECK_URL ?? "mysql://root:root@localhost:3307/athletics_transfer";
const CONTAINER = process.env.MARIADB_CONTAINER ?? "athletics-gym-mariadb";

/** Значение в общий вид: PostgreSQL и MariaDB отдают даты, булевы и списки по-разному. */
function normalize(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "boolean") return v ? "1" : "0";
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "bigint") return v.toString();
  return String(v);
}

function importDump(database: string): void {
  const sql = fs.readFileSync(DUMP_FILE);
  const run = (args: string[], input?: Buffer) =>
    spawnSync("docker", ["exec", "-i", CONTAINER, "mysql", "-uroot", "-proot", "--default-character-set=utf8mb4", ...args], { input });
  const create = run(["-e", `DROP DATABASE IF EXISTS ${database}; CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`]);
  if (create.status !== 0) throw new Error(`Не удалось создать проверочную базу: ${create.stderr}`);
  const imported = run([database], sql);
  if (imported.status !== 0) throw new Error(`Импорт дампа не удался: ${imported.stderr}`);
}

async function main() {
  for (const f of [DUMP_FILE, ZIP_FILE, MANIFEST_FILE]) if (!fs.existsSync(f)) throw new Error(`Нет ${path.relative(".", f)} — сначала npm run transfer:export.`);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8")) as { counts: Record<string, number> };
  const problems: string[] = [];

  const database = new URL(CHECK_URL).pathname.slice(1);
  importDump(database);
  console.log(`Дамп импортирован в локальную базу ${database}.`);

  const target = new PrismaClient({ datasourceUrl: singleConnectionUrl(CHECK_URL) });
  const source = await openSource(loadSource());
  try {
    for (const t of tables()) {
      const pk = t.columns.includes("id") ? "id" : t.columns[0];
      const { rows: from } = await source.query(`SELECT ${t.columns.map((c) => `"${c}"`).join(", ")} FROM "${t.name}"`);
      const to = await target.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT ${t.columns.map(quoteName).join(", ")} FROM ${quoteName(t.name)}`);
      const line = `${t.name}: Supabase ${from.length}, дамп ${manifest.counts[t.name] ?? "—"}, MariaDB ${to.length}`;
      if (from.length !== to.length || manifest.counts[t.name] !== from.length) problems.push(`Число строк не совпадает — ${line}`);
      console.log(line);

      const byKey = new Map(to.map((r) => [normalize(r[pk]), r]));
      for (const row of from) {
        const other = byKey.get(normalize(row[pk]));
        if (!other) {
          problems.push(`${t.name} ${normalize(row[pk])}: строки нет в MariaDB`);
          continue;
        }
        for (const c of t.columns) {
          // Списки бегущей строки в MariaDB лежат JSON-текстом
          const want = normalize(row[c]);
          const got = Array.isArray(row[c]) ? normalize(JSON.parse(String(other[c]))) : normalize(other[c]);
          if (want !== got) problems.push(`${t.name} ${normalize(row[pk])}.${c}: «${want.slice(0, 40)}» ≠ «${got.slice(0, 40)}»`);
        }
      }
    }

    // Фото: каждое, на которое ссылается импортированная база, — в архиве с копиями
    const zip = unzipSync(fs.readFileSync(ZIP_FILE));
    let photos = 0;
    for (const [table, columns] of Object.entries(PHOTO_COLUMNS)) {
      for (const column of columns) {
        const rows = await target.$queryRawUnsafe<{ v: string | null }[]>(`SELECT ${quoteName(column)} AS v FROM ${quoteName(table)}`);
        for (const { v } of rows) {
          if (!v) continue;
          photos++;
          for (const file of photoFiles(v)) {
            if (!zip[file]?.length) problems.push(`${table}.${column}: файла ${file} нет в архиве`);
          }
        }
      }
    }
    console.log(`Фото в базе: ${photos}, файлов в архиве: ${Object.keys(zip).length}.`);

    const applied = await migrate({ db: target, dir: path.join("prisma", "migrations"), log: (m) => problems.push(m) });
    if (applied.length) problems.push(`Скрипт миграций применил к импортированной базе: ${applied.join(", ")} — дамп неполный`);
  } finally {
    await source.query("ROLLBACK").catch(() => {});
    await source.end();
    await target.$disconnect();
  }

  if (problems.length) {
    console.error(`Найдено расхождений: ${problems.length}`);
    for (const p of problems.slice(0, 50)) console.error(" -", p);
    process.exitCode = 1;
  } else {
    console.log("Всё совпадает: строки, значения, Фото, миграции.");
  }
}

main().catch((e) => {
  console.error("Проверка не удалась:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
