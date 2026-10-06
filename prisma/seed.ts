import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.lesson.deleteMany();
  await db.trainer.deleteMany();
  await db.discipline.deleteMany();
  await db.tariff.deleteMany();

  // Тарифы: только известные из открытых источников (2ГИС), остальное — «уточняйте»
  await db.tariff.createMany({
    data: [
      {
        category: "MONTHLY",
        nameRu: "Месячный абонемент",
        nameKk: "Айлық абонемент",
        price: 9000,
        durationValue: 1,
        durationUnit: "MONTH",
        sortOrder: 1,
      },
      {
        category: "YEARLY",
        nameRu: "Годовой абонемент",
        nameKk: "Жылдық абонемент",
        price: 140000,
        durationValue: 12,
        durationUnit: "MONTH",
        sortOrder: 2,
      },
    ],
  });

  const disciplines = [
    {
      slug: "functional",
      nameRu: "Функциональный тренинг",
      nameKk: "Функционалдық тренинг",
      descriptionRu: "Сила, выносливость и координация в одной тренировке",
      descriptionKk: "Бір жаттығуда күш, төзімділік және үйлесімділік",
    },
    {
      slug: "crossfit",
      nameRu: "Кроссфит",
      nameKk: "Кроссфит",
      descriptionRu: "Интенсивные круговые тренировки в группе",
      descriptionKk: "Топпен қарқынды айналмалы жаттығулар",
    },
    {
      slug: "cycle",
      nameRu: "Сайкл",
      nameKk: "Сайкл",
      descriptionRu: "Кардио на велотренажёрах под музыку",
      descriptionKk: "Музыкамен велотренажердегі кардио",
    },
    {
      slug: "trx",
      nameRu: "TRX",
      nameKk: "TRX",
      descriptionRu: "Тренировки с петлями на весе собственного тела",
      descriptionKk: "Өз салмағыңызбен ілмектегі жаттығулар",
    },
  ];

  const d: Record<string, string> = {};
  for (const [i, item] of disciplines.entries()) {
    const created = await db.discipline.create({ data: { ...item, sortOrder: i } });
    d[item.slug] = created.id;
  }

  // Демо-тренеры: без реальных имён до согласия зала
  const trainerSpecs = [
    { slugs: ["functional", "crossfit"], takesPersonal: true },
    { slugs: ["cycle", "trx"], takesPersonal: false },
    { slugs: ["functional", "trx"], takesPersonal: true },
  ];
  const trainerIds: string[] = [];
  for (const [i, spec] of trainerSpecs.entries()) {
    const t = await db.trainer.create({
      data: {
        nameRu: "Тренер",
        nameKk: "Жаттықтырушы",
        takesPersonal: spec.takesPersonal,
        isDemo: true,
        sortOrder: i,
        disciplines: { connect: spec.slugs.map((s) => ({ id: d[s] })) },
      },
    });
    trainerIds.push(t.id);
  }

  // Демо-расписание (еженедельный шаблон)
  type Row = [weekday: number, time: string, slug: string, min: number, trainer: number | null];
  const rows: Row[] = [];
  for (const day of [1, 3, 5]) {
    rows.push([day, "08:00", "functional", 60, 0]);
    rows.push([day, "19:00", "crossfit", 60, 0]);
    rows.push([day, "20:30", "cycle", 45, 1]);
  }
  for (const day of [2, 4]) {
    rows.push([day, "09:00", "trx", 50, 1]);
    rows.push([day, "19:00", "functional", 60, 2]);
    rows.push([day, "20:00", "cycle", 45, null]);
  }
  rows.push([6, "10:00", "crossfit", 60, 0]);
  rows.push([6, "11:30", "trx", 50, 2]);

  await db.lesson.createMany({
    data: rows.map(([weekday, startTime, slug, durationMin, trainer]) => ({
      weekday,
      startTime,
      durationMin,
      disciplineId: d[slug],
      trainerId: trainer === null ? null : trainerIds[trainer],
      isDemo: true,
    })),
  });

  console.log("Готово: тарифы, направления, демо-тренеры и демо-расписание.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
