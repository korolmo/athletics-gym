// Общее для переноса данных с Supabase (PostgreSQL) на MariaDB хостинга (этап 8, ADR 0004).
// Строки подключения и ключи читаются из .env.preview (боевой проект) прямо в память — в process.env
// они не попадают и нигде не печатаются. Боевая база открывается только на чтение.

import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import dotenv from "dotenv";
import pg from "pg";

/**
 * Папка результата. На Windows по умолчанию C:\gym-transfer — вне папки проекта, которая лежит в OneDrive:
 * в дампе хэш пароля Владельца, в облако он попасть не должен. В других системах — transfer-out/ (в .gitignore).
 * TRANSFER_OUT_DIR — своя папка, например для пробного переноса с базы разработки, чтобы не затереть боевой.
 */
const DEFAULT_OUT_DIR = process.platform === "win32" ? "C:\\gym-transfer" : "transfer-out";
export const OUT_DIR = path.resolve(process.env.TRANSFER_OUT_DIR ?? DEFAULT_OUT_DIR);
export const DUMP_FILE = path.join(OUT_DIR, "athletics-dump.sql");
export const MEDIA_OUT = path.join(OUT_DIR, "media");
export const ZIP_FILE = path.join(OUT_DIR, "athletics-media.zip");
export const MANIFEST_FILE = path.join(OUT_DIR, "manifest.json");
export const BASELINE = "20261015000000_init_mariadb";

/** Колонки с путями Фото в хранилище (Trainer.photo — картинка из public/, не Фото). */
export const PHOTO_COLUMNS: Record<string, string[]> = {
  SiteSettings: ["heroPhoto", "womenPhoto"],
  Hall: ["pricePoster"],
  Trainer: ["uploadedPhoto"],
  GalleryPhoto: ["path"],
  Direction: ["photo"],
};

export type Source = { databaseUrl: string; supabaseUrl: string; serviceKey: string };

/** Боевой проект Supabase из .env.preview. Значения не печатаем — только имена недостающих. */
export function loadSource(file = process.env.TRANSFER_ENV_FILE ?? ".env.preview"): Source {
  if (!fs.existsSync(file)) throw new Error(`Нет файла ${file} с доступом к боевой Supabase.`);
  const env = dotenv.parse(fs.readFileSync(file));
  // Прямое подключение (session pooler, 5432) надёжнее для долгого чтения, чем пулер транзакций
  const databaseUrl = env.DIRECT_URL || env.DATABASE_URL;
  const missing = [
    ["DIRECT_URL или DATABASE_URL", databaseUrl],
    ["SUPABASE_URL", env.SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY],
  ]
    .filter(([, v]) => !v)
    .map(([name]) => name);
  if (missing.length) throw new Error(`В ${file} не заданы: ${missing.join(", ")}.`);
  return { databaseUrl: databaseUrl!, supabaseUrl: env.SUPABASE_URL!, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY! };
}

// timestamp(3) без часового пояса Prisma пишет в UTC; pg по умолчанию читал бы его как местное время
pg.types.setTypeParser(1114, (s: string) => new Date(`${s.replace(" ", "T")}Z`));

/** Подключение к боевой базе: одна транзакция только на чтение — снимок данных на один момент. */
export async function openSource(source: Source): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: source.databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  return client;
}

export type Table = { name: string; columns: string[] };

/** Таблицы и колонки — из схемы Prisma: те же имена в PostgreSQL и MariaDB (у моделей нет @@map). */
export function tables(): Table[] {
  return Prisma.dmmf.datamodel.models.map((m) => ({
    name: m.dbName ?? m.name,
    columns: m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum").map((f) => f.dbName ?? f.name),
  }));
}

/** Значение для SQL MariaDB. Строки экранируются по правилам MySQL; списки (text[]) — JSON-массив в тексте. */
export function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (v instanceof Date) return `'${v.toISOString().replace("T", " ").replace("Z", "")}'`;
  if (Array.isArray(v)) return sqlString(JSON.stringify(v));
  if (typeof v === "string") return sqlString(v);
  throw new Error(`Неизвестный тип значения: ${typeof v}`);
}

function sqlString(s: string): string {
  const escaped = s.replace(/[\0\n\r\b\t\x1a\\'"]/g, (c) => {
    switch (c) {
      case "\0":
        return "\\0";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\b":
        return "\\b";
      case "\t":
        return "\\t";
      case "\x1a":
        return "\\Z";
      default:
        return `\\${c}`;
    }
  });
  return `'${escaped}'`;
}

export const quoteName = (name: string) => `\`${name.replace(/`/g, "``")}\``;

/** Удаление папки: fs.rmSync в Node 25 на Windows молча не удаляет пути с кириллицей. */
export function removeDir(target: string): void {
  let st: fs.Stats;
  try {
    st = fs.lstatSync(target);
  } catch {
    return;
  }
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(target)) removeDir(path.join(target, name));
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}
