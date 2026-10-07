import { PrismaClient, type Access, type Audience, type TariffCategory } from "@prisma/client";

// Реальный прайс и Тренеры от Владельца (7 октября 2026):
// docs/owner/prices-2026-10.md и docs/owner/trainers-2026-10.md
const db = new PrismaClient();

type HallId = "general" | "women";

type TariffSeed = {
  category: TariffCategory;
  price: number;
  priceTo?: number;
  visitsPerMonth?: number;
  durationMonths?: number;
  access?: Access;
  audience?: Audience;
  titleRu?: string;
};

// Позиции прайса Зала — в порядке плаката
const hallTariffs: Record<HallId, TariffSeed[]> = {
  general: [
    { category: "SINGLE", price: 3000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "STUDENTS", price: 10000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "STUDENTS", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "ALL", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "WOMEN", price: 15000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "MEN", price: 17000 },
    { category: "UNLIMITED", durationMonths: 1, price: 25000 },
    { category: "UNLIMITED", durationMonths: 3, price: 60000 },
    { category: "UNLIMITED", durationMonths: 6, price: 120000 },
    { category: "UNLIMITED", durationMonths: 12, price: 170000 },
    // Строку «Жеке жаттықтырушы 15 000 – 25 000» не заводим: персональные цены — только у Тренеров
  ],
  women: [
    { category: "SINGLE", price: 3000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "STUDENTS", price: 10000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "STUDENTS", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "DAY", audience: "ALL", price: 12000 },
    { category: "VISITS", visitsPerMonth: 12, access: "FULL", audience: "ALL", price: 15000 },
    { category: "UNLIMITED", durationMonths: 1, price: 20000 },
    { category: "UNLIMITED", durationMonths: 3, price: 50000 },
    { category: "UNLIMITED", durationMonths: 6, price: 105000 },
    { category: "UNLIMITED", durationMonths: 12, price: 140000 },
  ],
};

// «Месяц» персональных = 12 тренировок в месяц (так на карточках Нұрмахана, Батырхана, Бауыржана)
const MONTH = { category: "PERSONAL" as const, visitsPerMonth: 12 };
const ONCE = { category: "PERSONAL" as const };

type TrainerSeed = {
  name: string;
  hall: HallId;
  photo: string;
  descriptionRu?: string;
  tariffs: TariffSeed[];
};

const trainers: TrainerSeed[] = [
  {
    name: "Нұрмахан",
    hall: "general",
    photo: "/trainers/nurmakhan.jpg",
    descriptionRu:
      "9 лет опыта в сфере фитнеса. Профессиональный тренер по пауэрлифтингу. Индивидуальные тренировки: набор мышечной массы, снижение веса, коррекция фигуры.",
    tariffs: [
      { ...MONTH, price: 20000 },
      // На карточке: «студентам и ученикам 25% скидка» → 20 000 − 25% = 15 000
      { ...MONTH, audience: "STUDENTS", price: 15000 },
    ],
  },
  {
    name: "Батырхан",
    hall: "general",
    photo: "/trainers/batyrkhan.jpg",
    descriptionRu:
      "Мастер спорта по боксу. Профессиональный тренер по пауэрлифтингу. Индивидуальные тренировки: набор мышечной массы, снижение веса, коррекция фигуры.",
    tariffs: [{ ...MONTH, price: 20000 }],
  },
  {
    name: "Бауыржан",
    hall: "general",
    photo: "/trainers/bauyrzhan.jpg",
    descriptionRu:
      "Стаж 10 лет. Персональные и индивидуальные тренировки: поможет набрать массу или скинуть вес. Школьникам и студентам предусмотрены скидки.",
    tariffs: [
      { ...MONTH, audience: "MEN", price: 25000 },
      { ...MONTH, audience: "WOMEN", price: 20000 },
    ],
  },
  {
    name: "Айша",
    hall: "women",
    photo: "/trainers/aisha.jpg",
    tariffs: [
      { ...MONTH, price: 20000 },
      { ...MONTH, audience: "STUDENTS", price: 15000 },
      { ...ONCE, price: 2000 },
    ],
  },
  {
    name: "Ақберген Шамшат",
    hall: "women",
    photo: "/trainers/shamshat.jpg",
    descriptionRu: "Персональные тренировки: сброс веса, набор массы, поддержание веса.",
    tariffs: [
      { ...MONTH, price: 20000 },
      // На карточке не сказано, за человека или за двоих — пишем как есть
      { ...MONTH, titleRu: "1+1 (подходит для подруг)", price: 13000 },
      { ...ONCE, price: 2000 },
    ],
  },
  {
    name: "Жанерке",
    hall: "women",
    photo: "/trainers/zhanerke.jpg",
    tariffs: [
      { ...MONTH, price: 20000 },
      { ...MONTH, audience: "STUDENTS", price: 15000 },
      { ...ONCE, price: 2000 },
    ],
  },
];

async function main() {
  await db.tariff.deleteMany();
  await db.trainer.deleteMany();
  await db.hall.deleteMany();

  await db.hall.createMany({
    data: [
      { id: "general", nameRu: "Общий зал", nameKk: "Жалпы зал", sortOrder: 0 },
      { id: "women", nameRu: "Женский зал", nameKk: "Әйелдер залы", sortOrder: 1 },
    ],
  });

  for (const hall of ["general", "women"] as const) {
    await db.tariff.createMany({
      data: hallTariffs[hall].map((t, i) => ({ ...t, hallId: hall, sortOrder: i })),
    });
  }

  for (const [i, tr] of trainers.entries()) {
    await db.trainer.create({
      data: {
        name: tr.name,
        hallId: tr.hall,
        photo: tr.photo,
        descriptionRu: tr.descriptionRu ?? null,
        sortOrder: i,
        tariffs: { create: tr.tariffs.map((t, j) => ({ ...t, hallId: tr.hall, sortOrder: j })) },
      },
    });
  }

  const [tariffCount, trainerCount] = await Promise.all([db.tariff.count(), db.trainer.count()]);
  console.log(`Готово: 2 Зала, ${trainerCount} Тренеров, ${tariffCount} Тарифов.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
