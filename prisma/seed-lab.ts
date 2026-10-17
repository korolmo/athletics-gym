import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { decideSeed } from "../src/lib/db-guard/production";
import { CONTACT_CHANNELS, CONTACT_LOCALES, CONTACT_SOURCES } from "../src/lib/domain/contact";
import { DEFAULT_DIRECTIONS } from "../src/lib/domain/direction.defaults";
import { settingsToRow } from "../src/lib/domain/site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "../src/lib/domain/site-settings.defaults";
import { LEGAL_UPDATED } from "../src/lib/legal/meta";
import { HALLS, MONTH, ONCE, hallTariffs, type HallId, type TariffSeed } from "./seed-data";

// Seed Лаборатории (ADR 0007): бренд, тексты и Тарифы Athletic's Gym; Тренеры вымышленные (без плакатов),
// Отзывы и Обращения синтетические. Копий боевой базы нет.
// Запуск: npm run seed:lab (строка базы и аккаунт Владельца — из .env.lab). Работает только при APP_ENV=lab.
const db = new PrismaClient();

type TrainerSeed = { name: string; hall: HallId; descriptionRu: string; tariffs: TariffSeed[] };

// Вымышленные люди: имён и описаний настоящих Тренеров здесь нет, плакатов (фото, контакты) — тоже
const trainers: TrainerSeed[] = [
  {
    name: "Ерлан (демо)",
    hall: "general",
    descriptionRu: "Вымышленный тренер Лаборатории. Силовые тренировки, набор массы, техника базовых упражнений.",
    tariffs: [
      { ...MONTH, price: 20000 },
      { ...MONTH, audience: "STUDENTS", price: 15000 },
    ],
  },
  {
    name: "Данияр (демо)",
    hall: "general",
    descriptionRu: "Вымышленный тренер Лаборатории. Функциональный тренинг и снижение веса.",
    tariffs: [{ ...MONTH, price: 22000 }],
  },
  {
    name: "Мадина (демо)",
    hall: "women",
    descriptionRu: "Вымышленный тренер Лаборатории. Коррекция фигуры, тренировки для начинающих.",
    tariffs: [
      { ...MONTH, price: 20000 },
      { ...ONCE, price: 2000 },
    ],
  },
  {
    name: "Алина (демо)",
    hall: "women",
    descriptionRu: "Вымышленный тренер Лаборатории. Растяжка и поддержание формы.",
    tariffs: [
      { ...MONTH, price: 18000 },
      { ...MONTH, titleRu: "1+1 (для подруг)", price: 13000 },
    ],
  },
];

type ReviewSeed = { authorName: string; text: string; rating: number; hall: HallId | null; status: "NEW" | "PUBLISHED" | "HIDDEN"; daysAgo: number };

// Синтетические Отзывы: в имени автора — «(демо)», чтобы их нельзя было принять за настоящие
const reviews: ReviewSeed[] = [
  { authorName: "Айгерим (демо)", text: "Синтетический отзыв Лаборатории: удобный женский зал, чисто, тренеры подсказывают технику.", rating: 5, hall: "women", status: "PUBLISHED", daysAgo: 3 },
  { authorName: "Арман (демо)", text: "Синтетический отзыв Лаборатории: много свободных весов, вечером бывает людно.", rating: 4, hall: "general", status: "PUBLISHED", daysAgo: 9 },
  { authorName: "Дана (демо)", text: "Синтетический отзыв Лаборатории: взяла пробное посещение, осталась на абонемент.", rating: 5, hall: "women", status: "PUBLISHED", daysAgo: 17 },
  { authorName: "Нурлан (демо)", text: "Синтетический отзыв Лаборатории: хорошие цены для студентов.", rating: 5, hall: null, status: "PUBLISHED", daysAgo: 26 },
  { authorName: "Асель (демо)", text: "Синтетический отзыв Лаборатории: ждёт решения Владельца в админке.", rating: 4, hall: "general", status: "NEW", daysAgo: 1 },
  { authorName: "Тимур (демо)", text: "Синтетический отзыв Лаборатории: скрыт Владельцем — пример модерации.", rating: 2, hall: null, status: "HIDDEN", daysAgo: 12 },
];

/** Детерминированный генератор (mulberry32): seed даёт одни и те же Обращения при каждом запуске. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Синтетические Обращения за 30 дней: WhatsApp чаще, первый экран и цены — главные Источники. */
function contactClicks(now: Date) {
  const rnd = random(20261017);
  const pick = <T,>(list: readonly T[], weights: number[]) => {
    let r = rnd() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= weights[i]) < 0) return list[i];
    return list[list.length - 1];
  };
  const channelWeights = CONTACT_CHANNELS.map((c) => (c === "whatsapp" ? 6 : c === "phone" ? 2 : 1));
  const sourceWeights = CONTACT_SOURCES.map((s) => (s === "hero" || s === "prices" ? 5 : s === "mobile-bar" ? 4 : 1));
  const clicks = [];
  for (let day = 0; day < 30; day++) {
    const count = 4 + Math.floor(rnd() * 9);
    for (let i = 0; i < count; i++) {
      const createdAt = new Date(now.getTime() - day * 86_400_000 - Math.floor(rnd() * 86_400_000));
      clicks.push({
        channel: pick(CONTACT_CHANNELS, channelWeights),
        source: pick(CONTACT_SOURCES, sourceWeights),
        locale: pick(CONTACT_LOCALES, [3, 1]),
        createdAt,
      });
    }
  }
  return clicks;
}

async function main() {
  if (process.env.APP_ENV !== "lab") {
    console.error("Отказ: seed Лаборатории работает только при APP_ENV=lab (npm run seed:lab берёт его из .env.lab).");
    process.exitCode = 1;
    return;
  }
  const decision = decideSeed({ DATABASE_URL: process.env.DATABASE_URL, APP_ENV: process.env.APP_ENV }, []);
  if (!decision.allowed || decision.production) {
    console.error("Отказ: строка подключения похожа на боевую базу.");
    process.exitCode = 1;
    return;
  }
  const login = process.env.ADMIN_LOGIN?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!login || !password) {
    console.error("Отказ: в .env.lab нет ADMIN_LOGIN / ADMIN_PASSWORD для аккаунта Владельца Лаборатории.");
    process.exitCode = 1;
    return;
  }

  const now = new Date();
  await db.contactClick.deleteMany();
  await db.review.deleteMany();
  await db.reviewSubmission.deleteMany();
  await db.tariff.deleteMany();
  await db.trainer.deleteMany();

  for (const hall of HALLS) await db.hall.upsert({ where: { id: hall.id }, update: hall, create: hall });
  for (const hall of ["general", "women"] as const) {
    await db.tariff.createMany({ data: hallTariffs[hall].map((t, i) => ({ ...t, hallId: hall, sortOrder: i })) });
  }
  for (const [i, tr] of trainers.entries()) {
    await db.trainer.create({
      data: {
        name: tr.name,
        hallId: tr.hall,
        descriptionRu: tr.descriptionRu,
        sortOrder: i,
        tariffs: { create: tr.tariffs.map((t, j) => ({ ...t, hallId: tr.hall, sortOrder: j })) },
      },
    });
  }

  // Тексты и контакты — Athletic's Gym; место хранения данных — честно для Лаборатории (ЕС), а не hoster.kz
  const settings = {
    ...settingsToRow(DEFAULT_SETTINGS),
    dataLocationRu: "на серверах в Европейском союзе (Vercel, TiDB Cloud, Supabase; Франкфурт) — демонстрационный стенд",
    dataLocationKk: "Еуропалық одақтағы серверлерде (Vercel, TiDB Cloud, Supabase; Франкфурт) — демонстрациялық стенд",
  };
  await db.siteSettings.upsert({ where: { id: "site" }, update: settings, create: { id: "site", ...settings } });
  for (const { position, ...card } of DEFAULT_ABOUT_CARDS) {
    await db.aboutCard.upsert({ where: { position }, update: card, create: { position, ...card } });
  }
  if ((await db.direction.count()) === 0) {
    await db.direction.createMany({ data: DEFAULT_DIRECTIONS.map((d, i) => ({ ...d, sortOrder: i })) });
  }

  await db.review.createMany({
    data: reviews.map((r) => {
      const at = new Date(now.getTime() - r.daysAgo * 86_400_000);
      return {
        authorName: r.authorName,
        text: r.text,
        rating: r.rating,
        hallId: r.hall,
        source: "SITE" as const,
        reviewedAt: at,
        createdAt: at,
        status: r.status,
        fromVisitor: true,
        consentAt: at,
        consentPolicyDate: LEGAL_UPDATED.privacy,
      };
    }),
  });
  const clicks = contactClicks(now);
  await db.contactClick.createMany({ data: clicks });

  // Аккаунт Владельца Лаборатории: логин и пароль — из .env.lab; при каждом seed пароль сбрасывается к ним,
  // а старые сессии отзываются
  const passwordHash = await hashPassword(password);
  await db.owner.upsert({
    where: { id: "owner" },
    update: { login, passwordHash, sessionVersion: { increment: 1 } },
    create: { id: "owner", login, passwordHash },
  });

  const [tariffCount, trainerCount] = await Promise.all([db.tariff.count(), db.trainer.count()]);
  console.log(
    `Готово (Лаборатория): 2 Зала, ${trainerCount} вымышленных Тренеров, ${tariffCount} Тарифов, ${reviews.length} синтетических Отзывов, ${clicks.length} Обращений, аккаунт Владельца.`,
  );
}

main()
  .catch((e) => {
    console.error(String(e?.message ?? e).replace(/mysql:\/\/\S+/g, "<url>"));
    process.exit(1);
  })
  .finally(() => db.$disconnect());
