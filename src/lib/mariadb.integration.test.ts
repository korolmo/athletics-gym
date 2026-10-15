import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isNotFound } from "@/lib/admin/db-errors";
import { settingsFromRow, settingsToRow } from "@/lib/domain/site-settings";
import { DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";

// Проверки на настоящей MariaDB 10.4 (ADR 0004): миграции нашим скриптом, типы колонок, кодировка, даты.
// База должна быть отдельной — тест удаляет в ней все таблицы. В CI — сервис mariadb:10.4 (.github/workflows/ci.yml),
// локально: TEST_DATABASE_URL="mysql://root:root@localhost:3307/athletics_test" npm test

const URL_ = process.env.TEST_DATABASE_URL;
const require = createRequire(import.meta.url);
const { migrate, singleConnectionUrl } = require("../../scripts/standalone/migrate.cjs") as {
  migrate: (o: { db: PrismaClient; dir: string; log?: (m: string) => void }) => Promise<string[]>;
  singleConnectionUrl: (url: string) => string;
};
const DIR = "prisma/migrations";
const BASELINE = "20261015000000_init_mariadb";

describe.skipIf(!URL_)("MariaDB: схема и данные", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = new PrismaClient({ datasourceUrl: singleConnectionUrl(URL_!) });
    const tables = await db.$queryRawUnsafe<{ name: string }[]>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
    );
    await db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of tables) await db.$executeRawUnsafe(`DROP TABLE \`${t.name}\``);
    await db.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  it("миграции применяются нашим скриптом и записываются, как у Prisma; второй запуск ничего не делает", async () => {
    const log: string[] = [];
    expect(await migrate({ db, dir: DIR, log: (m) => log.push(m) })).toEqual([BASELINE]);
    expect(await migrate({ db, dir: DIR, log: (m) => log.push(m) })).toEqual([]);
    const [row] = await db.$queryRawUnsafe<{ checksum: string; steps: number }[]>(
      "SELECT checksum, applied_steps_count AS steps FROM _prisma_migrations WHERE migration_name = ?",
      BASELINE,
    );
    const file = fs.readFileSync(`${DIR}/${BASELINE}/migration.sql`);
    expect(row.checksum).toBe(crypto.createHash("sha256").update(file).digest("hex"));
    expect(Number(row.steps)).toBe(1);
    expect(log.filter((m) => m.startsWith("Внимание"))).toEqual([]);
  });

  it("недоделанная миграция останавливает следующие", async () => {
    await db.$executeRawUnsafe(
      "INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at) VALUES ('x', 'x', '29990101000000_broken', NOW(3))",
    );
    await expect(migrate({ db, dir: DIR, log: () => {} })).rejects.toThrow(/не дошла до конца/);
    await db.$executeRawUnsafe("DELETE FROM _prisma_migrations WHERE id = 'x'");
  });

  it("длинные тексты на казахском и эмодзи сохраняются без обрезки (utf8mb4, TEXT)", async () => {
    await db.hall.create({ data: { id: "general", nameRu: "Общий зал", nameKk: "Жалпы зал" } });
    const kk = "Қазақша мәтін ғұңәөүһі ";
    const long1000 = (kk.repeat(50) + "💪").slice(0, 999) + "💪";
    const review = await db.review.create({
      data: {
        authorName: "Әлия 😊",
        text: long1000,
        rating: 5,
        hallId: "general",
        source: "SITE",
        sourceUrl: "https://2gis.kz/" + "a".repeat(280),
        reviewedAt: new Date("2026-10-15T23:30:00.123Z"),
        status: "NEW",
        fromVisitor: true,
        consentAt: new Date("2026-10-15T23:30:00.456Z"),
        consentPolicyDate: "2026-10-15",
      },
    });
    const back = await db.review.findUniqueOrThrow({ where: { id: review.id } });
    expect(back.text).toBe(long1000);
    expect(back.authorName).toBe("Әлия 😊");
    expect(back.sourceUrl).toHaveLength(296);

    const trainer = await db.trainer.create({
      data: { name: "Тренер", hallId: "general", descriptionRu: "д".repeat(600), descriptionKk: "қ".repeat(600) },
    });
    expect((await db.trainer.findUniqueOrThrow({ where: { id: trainer.id } })).descriptionKk).toHaveLength(600);
  });

  it("даты — в UTC с миллисекундами, независимо от часового пояса", async () => {
    const r = await db.review.findFirstOrThrow({ where: { fromVisitor: true } });
    expect(r.reviewedAt.toISOString()).toBe("2026-10-15T23:30:00.123Z");
    expect(r.consentAt?.toISOString()).toBe("2026-10-15T23:30:00.456Z");
  });

  it("Настройки сайта: списки бегущей строки туда и обратно, длинные тексты", async () => {
    const data = {
      ...DEFAULT_SETTINGS,
      heroSubtitleRu: "п".repeat(300),
      womenTextKk: "ә".repeat(600),
      marqueeRu: ["«ЖИМ»; лёжа", "{часы}"],
      marqueeKk: ["ҚҰҒ", ""],
    };
    await db.siteSettings.create({ data: { id: "site", ...settingsToRow(data) } });
    const back = settingsFromRow(await db.siteSettings.findUniqueOrThrow({ where: { id: "site" } }));
    expect(back.marqueeRu).toEqual(data.marqueeRu);
    expect(back.marqueeKk).toEqual(data.marqueeKk);
    expect(back.heroSubtitleRu).toHaveLength(300);
    expect(back.womenTextKk).toHaveLength(600);
    await db.siteSettings.update({ where: { id: "site" }, data: settingsToRow({ marqueeRu: ["ОДИН"] }) });
    expect(settingsFromRow(await db.siteSettings.findUniqueOrThrow({ where: { id: "site" } })).marqueeRu).toEqual(["ОДИН"]);
  });

  it("enum и группировка по статусу", async () => {
    await db.review.create({
      data: { authorName: "Владелец", text: "Ручной отзыв", rating: 4, source: "TWOGIS", reviewedAt: new Date(), status: "PUBLISHED" },
    });
    const groups = await db.review.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } });
    expect(groups.map((g) => [g.status, g._count._all])).toEqual([
      ["NEW", 1],
      ["PUBLISHED", 1],
    ]);
    await expect(db.$executeRawUnsafe("UPDATE `Review` SET `status` = 'WRONG'")).rejects.toThrow();
  });

  it("уникальный путь Фото Галереи; правка несуществующей записи — P2025", async () => {
    const path = `gallery/${crypto.randomUUID()}.webp`;
    await db.galleryPhoto.create({ data: { path } });
    await expect(db.galleryPhoto.create({ data: { path } })).rejects.toMatchObject({ code: "P2002" });
    const missing = await db.galleryPhoto.update({ where: { id: "нет" }, data: { isVisible: false } }).catch((e: unknown) => e);
    expect(isNotFound(missing)).toBe(true);
  });

  it("транзакция из нескольких правок порядка", async () => {
    const a = await db.direction.create({ data: { titleRu: "А", sortOrder: 0 } });
    const b = await db.direction.create({ data: { titleRu: "Б", sortOrder: 1 } });
    await db.$transaction([
      db.direction.update({ where: { id: a.id }, data: { sortOrder: 1 } }),
      db.direction.update({ where: { id: b.id }, data: { sortOrder: 0 } }),
    ]);
    expect((await db.direction.findMany({ orderBy: { sortOrder: "asc" } })).map((d) => d.titleRu)).toEqual(["Б", "А"]);
  });

  it("логин Владельца сравнивается без учёта регистра (utf8mb4_unicode_ci): второй аккаунт «Admin» не создать", async () => {
    await db.owner.create({ data: { login: "admin", passwordHash: "x" } });
    await expect(db.owner.create({ data: { id: "other", login: "Admin", passwordHash: "x" } })).rejects.toMatchObject({ code: "P2002" });
  });
});
