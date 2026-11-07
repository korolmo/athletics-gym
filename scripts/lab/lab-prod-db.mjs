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

async function main() {
  const migrate = spawnSync(process.execPath, ["scripts/standalone/migrate.cjs"], { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
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
