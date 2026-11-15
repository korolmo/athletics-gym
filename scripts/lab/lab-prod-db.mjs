// База основной Лаборатории (production проекта athletics-gym-lab, база athletics в кластере TiDB) — перед каждой
// выкаткой main (lab.yml):
//   1) миграции — тем же scripts/standalone/migrate.cjs, что на hoster.kz и в превью: новый код не должен выйти
//      на базу без своих таблиц (этап 1: без Client, Booking и часов Тренеров кабинет отвечал «вход недоступен»);
//   2) вымышленным Тренерам Лаборатории, у которых часов работы ещё нет, — часы по умолчанию, чтобы в демо-кабинете
//      было свободное время. Тренеров, у которых Владелец уже задал часы, не трогаем. Данных не удаляем.
// Адрес кластера — LAB_DATABASE_URL (секрет), база здесь всегда athletics. Боевую базу (hoster.kz) этот скрипт
// не знает и знать не может: её адрес есть только в Plesk.
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { hideUrl, withConnectRetry } from "./connect-retry.mjs";
import { labProductionUrl } from "./preview-db-core.mjs";

const base = process.env.LAB_DATABASE_URL;
if (!base) {
  console.error("Нет LAB_DATABASE_URL (секрет репозитория) — миграции Лаборатории пропущены.");
  process.exit(1);
}
const url = labProductionUrl(base);

/** Пн–сб 09:00–13:00 и 15:00–21:00, тренировка — час; как в seed Лаборатории для превью. */
const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, startMin: 9 * 60, endMin: 13 * 60 },
  { weekday, startMin: 15 * 60, endMin: 21 * 60 },
]);

/**
 * Разовая починка (15 ноября 2026): первая редакция миграции 20261115000000_club_id упала на TiDB на AboutCard
 * (ошибка 8200 — нельзя сбросить кластерный первичный ключ), успев добавить clubId (и kind у Hall) в пять таблиц.
 * DDL в MySQL-совместимых базах не откатывается, а незаконченная строка в _prisma_migrations останавливает
 * migrate.cjs. Здесь — снять частичные колонки и строку; исправленная миграция применится заново целиком.
 * Срабатывает только при незаконченной строке этой миграции. Удалить после того, как Лаборатория её применит.
 */
const BROKEN = "20261115000000_club_id";
const PARTIAL = [
  ["Hall", "clubId"],
  ["Hall", "kind"],
  ["Tariff", "clubId"],
  ["Trainer", "clubId"],
  ["Owner", "clubId"],
  ["SiteSettings", "clubId"],
];

async function repairBrokenClubId() {
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await withConnectRetry(() => db.$queryRawUnsafe("SELECT 1"));
    const [table] = await db.$queryRawUnsafe(
      "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'",
    );
    if (Number(table.n) === 0) return;
    const [row] = await db.$queryRawUnsafe(
      "SELECT COUNT(*) AS n FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL AND rolled_back_at IS NULL",
      BROKEN,
    );
    if (Number(row.n) === 0) return;
    for (const [t, c] of PARTIAL) await db.$executeRawUnsafe(`ALTER TABLE \`${t}\` DROP COLUMN IF EXISTS \`${c}\``);
    await db.$executeRawUnsafe("DROP TABLE IF EXISTS `AboutCard_p2`");
    await db.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE migration_name = ? AND finished_at IS NULL", BROKEN);
    console.log(`Лаборатория: незаконченная миграция ${BROKEN} снята, частичные колонки удалены — применяю заново.`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  await repairBrokenClubId();
  const migrate =spawnSync(process.execPath, ["scripts/standalone/migrate.cjs"], { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
  if (migrate.status !== 0) throw new Error(`Миграции Лаборатории не применились (код ${migrate.status}).`);

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await withConnectRetry(() => db.$queryRawUnsafe("SELECT 1"));
    const trainers = await db.trainer.findMany({ where: { workHours: { none: {} }, schedule: null }, select: { id: true } });
    for (const { id } of trainers) {
      await db.trainer.update({
        where: { id },
        data: { schedule: { create: { sessionMinutes: 60 } }, workHours: { create: DEFAULT_HOURS } },
      });
    }
    console.log(`Лаборатория: часы работы по умолчанию заданы Тренерам без часов — ${trainers.length}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(hideUrl(e?.message ?? String(e)));
  process.exitCode = 1;
});
