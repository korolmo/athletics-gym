// Эфемерные базы превью Лаборатории (ADR 0012).
//   node scripts/lab/preview-db.mjs prepare <номер PR>  — лимит баз, пересоздание pr_<номер> пустой;
//                                                        в GitHub Actions адрес уходит в $GITHUB_ENV (PREVIEW_DATABASE_URL, под маской)
//   node scripts/lab/preview-db.mjs drop <номер PR>     — удалить pr_<номер> (PR закрыт)
// Адрес кластера — LAB_DATABASE_URL (база в пути неважна). Работает только с базами pr_<число>.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { databasesToDrop, previewDbName, withDatabase } from "./preview-db-core.mjs";

const [command, prNumber] = process.argv.slice(2);
const base = process.env.LAB_DATABASE_URL;
if (!["prepare", "drop"].includes(command) || !prNumber) {
  console.error("Использование: node scripts/lab/preview-db.mjs prepare|drop <номер PR>");
  process.exit(2);
}
if (!base) {
  console.error("Нет LAB_DATABASE_URL (секрет репозитория) — базы превью недоступны.");
  process.exit(1);
}

const name = previewDbName(prNumber);
const db = new PrismaClient({ datasourceUrl: withDatabase(base, "mysql") });

async function previewDatabases() {
  const schemas = await db.$queryRawUnsafe("SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'pr\_%'");
  const created = await db.$queryRawUnsafe(
    "SELECT TABLE_SCHEMA AS name, MIN(CREATE_TIME) AS createdAt FROM information_schema.TABLES WHERE TABLE_SCHEMA LIKE 'pr\_%' GROUP BY TABLE_SCHEMA",
  );
  const byName = new Map(created.map((r) => [r.name, r.createdAt ? new Date(r.createdAt) : null]));
  return schemas.map((s) => ({ name: s.name, createdAt: byName.get(s.name) ?? null }));
}

// Имена проверены previewDbName / databasesToDrop: только pr_<число>, поэтому подстановка в SQL безопасна
async function main() {
  if (command === "drop") {
    await db.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``);
    console.log(`База превью ${name} удалена.`);
    return;
  }
  for (const old of databasesToDrop(await previewDatabases(), name)) {
    await db.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${old}\``);
    console.log(`Лимит баз превью: удалена самая старая — ${old}.`);
  }
  // Каждая выкатка превью — с чистой базой: миграции этого PR с нуля и seed:lab
  await db.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``);
  await db.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`База превью ${name} создана.`);
  if (process.env.GITHUB_ENV) {
    const url = withDatabase(base, name);
    console.log(`::add-mask::${url}`);
    fs.appendFileSync(process.env.GITHUB_ENV, `PREVIEW_DATABASE_URL=${url}\n`);
  }
}

main()
  .catch((e) => {
    console.error(String(e?.message ?? e).replace(/mysql:\/\/\S+/g, "<url>"));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
