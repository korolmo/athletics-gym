// Миграции базы на хостинге без Prisma CLI (ADR 0004): у Plesk нет SSH, а CLI с движками схемы под все
// варианты Linux занял бы ещё ~100 МБ диска. Применяет prisma/migrations по порядку и ведёт ту же таблицу
// _prisma_migrations, что и `prisma migrate deploy`, — история совместима с Prisma.
//
// Запуск: при старте приложения (start.cjs, если MIGRATE_ON_START не 0) или вручную — `npm run db:migrate`
// («Выполнить сценарий» в Plesk). Два процесса не применяют миграции одновременно: GET_LOCK в базе.
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { splitSql } = require("./sql-split.cjs");

const LOCK = "athletics_migrate";

const TABLE = `CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  finished_at DATETIME(3) NULL,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT NULL,
  rolled_back_at DATETIME(3) NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_steps_count INTEGER UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

function listMigrations(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, "migration.sql")))
    .map((d) => d.name)
    .sort();
}

/** Применяет недостающие миграции. Возвращает имена применённых сейчас. */
async function migrate({ db, dir, log = console.log }) {
  const [lock] = await db.$queryRawUnsafe(`SELECT GET_LOCK('${LOCK}', 120) AS got`);
  if (Number(lock && lock.got) !== 1) throw new Error("Миграции уже применяет другой процесс: за 2 минуты он не закончил.");
  try {
    await db.$executeRawUnsafe(TABLE);
    const rows = await db.$queryRawUnsafe(
      "SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations",
    );
    const failed = rows.find((r) => r.finished_at === null && r.rolled_back_at === null);
    if (failed) {
      throw new Error(
        `Миграция ${failed.migration_name} когда-то не дошла до конца. Новые не применяю: сначала разберитесь с ней (docs/hosting-plesk.md, «Миграции»).`,
      );
    }
    const done = new Map(rows.filter((r) => r.finished_at !== null).map((r) => [r.migration_name, r.checksum]));
    const applied = [];
    for (const name of listMigrations(dir)) {
      const sql = fs.readFileSync(path.join(dir, name, "migration.sql"), "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      if (done.has(name)) {
        if (done.get(name) !== checksum) log(`Внимание: файл миграции ${name} изменён после применения — повторно не применяю.`);
        continue;
      }
      const id = crypto.randomUUID();
      await db.$executeRawUnsafe(
        "INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, NOW(3), 0)",
        id,
        checksum,
        name,
      );
      try {
        for (const statement of splitSql(sql)) await db.$executeRawUnsafe(statement);
      } catch (e) {
        await db.$executeRawUnsafe("UPDATE _prisma_migrations SET logs = ? WHERE id = ?", String(e && e.message), id).catch(() => {});
        throw new Error(`Миграция ${name} не применилась: ${e && e.message}`);
      }
      await db.$executeRawUnsafe("UPDATE _prisma_migrations SET finished_at = NOW(3), applied_steps_count = 1 WHERE id = ?", id);
      applied.push(name);
      log(`Миграция применена: ${name}`);
    }
    return applied;
  } finally {
    await db.$queryRawUnsafe(`SELECT RELEASE_LOCK('${LOCK}')`).catch(() => {});
  }
}

/**
 * Строка подключения с одним соединением: GET_LOCK держится на соединении, и все запросы миграции
 * должны идти через него же.
 */
function singleConnectionUrl(url) {
  if (!url) throw new Error("DATABASE_URL не задана (Plesk → Node.js → Переменные среды).");
  const u = new URL(url);
  u.searchParams.set("connection_limit", "1");
  return u.toString();
}

module.exports = { migrate, listMigrations, singleConnectionUrl };

if (require.main === module) {
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: singleConnectionUrl(process.env.DATABASE_URL) });
  // В собранном приложении папка миграций лежит рядом с этим файлом, в репозитории — в prisma/ от корня
  const bundled = path.join(__dirname, "prisma", "migrations");
  migrate({ db, dir: fs.existsSync(bundled) ? bundled : path.resolve("prisma", "migrations") })
    .then((applied) => console.log(applied.length ? `Готово: применено ${applied.length}.` : "Новых миграций нет."))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
