import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import type { PrismaClient } from "../generated/prisma/client";
import { createPrismaClient } from "./db-client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isNotFound } from "@/lib/admin/db-errors";
import { settingsFromRow, settingsToRow } from "@/modules/site/client";
import { DEFAULT_SETTINGS } from "@/modules/site/client";
import { CLUB_FIELDS, CLUB_ID, DEFAULT_CLUB } from "@/modules/club/client";

// Проверки на настоящей MariaDB 10.4 (ADR 0004): миграции нашим скриптом, типы колонок, кодировка, даты.
// База должна быть отдельной — тест удаляет в ней все таблицы. В CI — сервис mariadb:10.4 (.github/workflows/ci.yml),
// локально: TEST_DATABASE_URL="mysql://root:root@localhost:3307/athletics_test" npm test

const URL_ = process.env.TEST_DATABASE_URL;
const require = createRequire(import.meta.url);
const { migrate } = require("../../scripts/standalone/migrate.cjs") as {
  migrate: (o: { db: PrismaClient; dir: string; log?: (m: string) => void }) => Promise<string[]>;
};
const DIR = "prisma/migrations";
const BASELINE = "20261015000000_init_mariadb";
/** Все миграции папки по порядку: базовая и все после неё (этап 1 — Клиенты). */
const ALL = fs.readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();

describe.skipIf(!URL_)("MariaDB: схема и данные", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = createPrismaClient(URL_!, { connectionLimit: 1 });
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
    expect(await migrate({ db, dir: DIR, log: (m) => log.push(m) })).toEqual(ALL);
    expect(ALL[0]).toBe(BASELINE);
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

  it("Клуб после миграции — Athletic's Gym один в один с DEFAULT_CLUB (этап П1, решение 7)", async () => {
    expect(await db.club.findUniqueOrThrow({ where: { id: CLUB_ID }, select: CLUB_FIELDS })).toEqual(DEFAULT_CLUB);
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

// ——— Записи (этап 1, ADR 0017): гарантии базы под параллельной нагрузкой ———
// Сервис Записей — настоящий, на пуле соединений к той же тестовой базе. Окна подменены и всегда «свободны»:
// проверка в коде пропускает всех, и единственная защита — уникальный индекс и блокировка строки Клиента.

const pooled = vi.hoisted(() => ({ db: null as PrismaClient | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const { createPrismaClient: create } = await import("./db-client");
  pooled.db = create(process.env.TEST_DATABASE_URL);
  return { db: pooled.db };
});
vi.mock("@/modules/owner", () => ({ requireOwner: async () => {} }));
vi.mock("@/modules/trainers", () => ({ getBookableTrainer: async () => ({ id: "race-trainer", name: "Тренер", hallId: "general" }) }));
vi.mock("@/modules/schedule", () => ({ BOOKING_HORIZON_DAYS: 14, isWindowFree: async () => true, sessionMinutesOf: async () => 60 }));

describe.skipIf(!URL_)("Записи на MariaDB: гонка", () => {
  const TZ = "Asia/Qyzylorda";
  const now = new Date("2026-11-09T03:00:00Z");
  const start = new Date("2026-11-11T14:00:00Z");
  const key = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  let db: PrismaClient;
  let createBookingFor: typeof import("@/modules/bookings/service/bookings").createBookingFor;

  beforeAll(async () => {
    ({ createBookingFor } = await import("@/modules/bookings/service/bookings"));
    db = pooled.db!;
    await db.hall.upsert({ where: { id: "general" }, create: { id: "general", nameRu: "Общий зал" }, update: {} });
    await db.trainer.create({ data: { id: "race-trainer", name: "Тренер", hallId: "general" } });
    await db.client.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        id: `race${i}`,
        phone: `+7700${String(i).padStart(7, "0")}`,
        name: `Клиент ${i}`,
        consentAt: now,
        consentPolicyDate: "2026-11-07",
        lastLoginAt: now,
      })),
    });
  });

  afterAll(async () => {
    await pooled.db?.$disconnect();
  });

  it("50 Клиентов параллельно на одно Окно — ровно одна Запись, остальным «занято»", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) => createBookingFor(`race${i}`, { trainerId: "race-trainer", startAt: start, idempotencyKey: key(i) }, TZ, now)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error === "taken")).toHaveLength(49);
    expect(await db.booking.count({ where: { trainerId: "race-trainer", startAt: start, status: "ACTIVE" } })).toBe(1);
  });

  it("отмена освобождает Окно: снова можно записаться", async () => {
    const active = await db.booking.findFirstOrThrow({ where: { startAt: start, status: "ACTIVE" } });
    await db.booking.update({ where: { id: active.id }, data: { status: "CANCELLED", activeTrainerId: null } });
    const again = await createBookingFor("race49", { trainerId: "race-trainer", startAt: start, idempotencyKey: key(100) }, TZ, now);
    expect(again.ok).toBe(true);
  });

  it("один Клиент, 10 параллельных Записей на разное время — не больше 3", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createBookingFor("race7", { trainerId: "race-trainer", startAt: new Date(start.getTime() + (i + 1) * 3_600_000), idempotencyKey: key(200 + i) }, TZ, now),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok && r.error === "limit")).toHaveLength(7);
  });

  it("одна форма, отправленная 10 раз параллельно, — одна Запись", async () => {
    const at = new Date(start.getTime() + 24 * 3_600_000);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => createBookingFor("race8", { trainerId: "race-trainer", startAt: at, idempotencyKey: key(300) }, TZ, now)),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    expect(new Set(results.map((r) => (r.ok ? r.booking.id : "")))).toHaveProperty("size", 1);
    expect(await db.booking.count({ where: { idempotencyKey: key(300) } })).toBe(1);
  });
});
