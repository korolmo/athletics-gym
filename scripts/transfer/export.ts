// Перенос данных с боевой Supabase на MariaDB хостинга hoster.kz (этап 8, шаг 5; ADR 0004).
// Запуск: npm run transfer:export
// Результат — в C:\gym-transfer на Windows, вне OneDrive (в других системах — transfer-out/; см. OUT_DIR в common.ts):
//   athletics-dump.sql — схема (базовая миграция) + все данные + запись о миграции, для MariaDB 10.4;
//   athletics-media.zip — все Фото из бакета media с уменьшенными копиями, распаковывается в MEDIA_DIR;
//   manifest.json — сколько строк в каждой таблице и какие Фото — для проверки (npm run transfer:verify).
// Боевая база только читается (транзакция READ ONLY), хранилище — только скачивается.
// В дампе есть хэш пароля Владельца: храните файлы у себя и удалите после импорта.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { zipSync } from "fflate";
import { MEDIA_BUCKET, isPhotoPath, storageOrigin } from "../../src/lib/domain/photo";
import { photoWithVariants } from "./photo-variants";
import { BASELINE, DUMP_FILE, MANIFEST_FILE, MEDIA_OUT, OUT_DIR, ZIP_FILE, PHOTO_COLUMNS, loadSource, openSource, quoteName, removeDir, sqlValue, tables } from "./common";

const MIGRATIONS_TABLE = `CREATE TABLE _prisma_migrations (
  id VARCHAR(36) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  finished_at DATETIME(3) NULL,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT NULL,
  rolled_back_at DATETIME(3) NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_steps_count INTEGER UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;

async function main() {
  const source = loadSource();
  const origin = storageOrigin(source.supabaseUrl);
  if (!origin) throw new Error("SUPABASE_URL в .env.preview записан с ошибкой (значение не показываю).");

  const baselineFile = path.join("prisma", "migrations", BASELINE, "migration.sql");
  const baseline = fs.readFileSync(baselineFile);
  if (baseline.includes("\r\n")) throw new Error(`${baselineFile} с концами строк CRLF: выполните git add --renormalize . (см. .gitattributes).`);
  const checksum = crypto.createHash("sha256").update(baseline).digest("hex");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  removeDir(MEDIA_OUT);

  const db = await openSource(source);
  const counts: Record<string, number> = {};
  const photos = new Set<string>();
  const foreign: string[] = [];
  const out: string[] = [
    "-- Athletic's Gym: перенос с Supabase на MariaDB 10.4 (этап 8). Создан scripts/transfer/export.ts.",
    `-- ${new Date().toISOString()}. Импорт заменяет все таблицы сайта: только в пустую базу хостинга.`,
    "-- В дампе хэш пароля Владельца: не публиковать, удалить после импорта.",
    "SET NAMES utf8mb4;",
    "SET time_zone = '+00:00';",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
  ];
  try {
    const list = tables();
    for (const t of [...list.map((t) => t.name), "_prisma_migrations"]) out.push(`DROP TABLE IF EXISTS ${quoteName(t)};`);
    out.push("", baseline.toString("utf8").trim(), "", MIGRATIONS_TABLE);
    out.push(
      `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (${[
        crypto.randomUUID(),
        checksum,
        new Date(),
        BASELINE,
        null,
        null,
        new Date(),
        1,
      ]
        .map(sqlValue)
        .join(", ")});`,
      "",
    );

    for (const t of list) {
      const cols = t.columns.map((c) => `"${c}"`).join(", ");
      const { rows } = await db.query(`SELECT ${cols} FROM "${t.name}"`);
      counts[t.name] = rows.length;
      for (const column of PHOTO_COLUMNS[t.name] ?? []) {
        for (const row of rows) {
          const value = row[column] as string | null;
          if (!value) continue;
          if (isPhotoPath(value)) photos.add(value);
          else foreign.push(`${t.name}.${column}`);
        }
      }
      if (rows.length === 0) continue;
      out.push(`-- ${t.name}: ${rows.length}`);
      const names = t.columns.map(quoteName).join(", ");
      for (let i = 0; i < rows.length; i += 100) {
        const values = rows.slice(i, i + 100).map((r) => `(${t.columns.map((c) => sqlValue(r[c])).join(", ")})`);
        out.push(`INSERT INTO ${quoteName(t.name)} (${names}) VALUES\n${values.join(",\n")};`);
      }
      out.push("");
    }
  } finally {
    await db.query("ROLLBACK").catch(() => {});
    await db.end();
  }
  out.push("SET FOREIGN_KEY_CHECKS = 1;", "");
  fs.writeFileSync(DUMP_FILE, out.join("\n"));
  if (foreign.length) console.warn(`Внимание: пути не по правилу имён Фото в ${[...new Set(foreign)].join(", ")} — на сайте их не будет.`);

  // Фото: скачиваем всё, на что ссылается база, и делаем уменьшенные копии (до этапа 8 их не было)
  const storage = createClient(origin, source.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const files: Record<string, Uint8Array> = {};
  const missing: string[] = [];
  for (const photo of [...photos].sort()) {
    const { data, error } = await storage.storage.from(MEDIA_BUCKET).download(photo);
    if (error || !data) {
      missing.push(photo);
      continue;
    }
    Object.assign(files, await photoWithVariants(photo, new Uint8Array(await data.arrayBuffer())));
  }
  for (const [rel, bytes] of Object.entries(files)) {
    const target = path.join(MEDIA_OUT, ...rel.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  // Фото уже сжаты — в архив кладём без сжатия
  fs.writeFileSync(ZIP_FILE, zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [v, { level: 0 }]]))));

  const manifest = { createdAt: new Date().toISOString(), counts, photos: [...photos].sort(), missingPhotos: missing, files: Object.keys(files).sort() };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

  const mb = (f: string) => (fs.statSync(f).size / 1024 / 1024).toFixed(1);
  console.log("Строк в таблицах:", counts);
  console.log(`Фото: ${photos.size} (файлов с копиями — ${Object.keys(files).length}), не скачались: ${missing.length}.`);
  console.log(`Готово: ${path.relative(".", DUMP_FILE)} (${mb(DUMP_FILE)} МБ), ${path.relative(".", ZIP_FILE)} (${mb(ZIP_FILE)} МБ).`);
  if (missing.length) {
    console.error("Не скачались Фото:", missing);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("Перенос не удался:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
