import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDictionary, isLocale, pick } from "@/lib/i18n";
import {
  About,
  Contacts,
  Disciplines,
  Footer,
  Header,
  Hero,
  MobileBar,
  Prices,
  Rating,
  ScheduleSection,
  Trainers,
  Women,
} from "@/components/site/sections";
import { Schedule, type LessonView } from "@/components/site/Schedule";

// Данные меняет Администратор — всегда читаем свежие из базы
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [tariffs, disciplines, trainers, lessons] = await Promise.all([
    db.tariff.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }],
    }),
    db.discipline.findMany({ orderBy: { sortOrder: "asc" } }),
    db.trainer.findMany({
      orderBy: { sortOrder: "asc" },
      include: { disciplines: { orderBy: { sortOrder: "asc" } } },
    }),
    db.lesson.findMany({ include: { discipline: true, trainer: true } }),
  ]);

  const lessonViews: LessonView[] = lessons.map((l) => ({
    id: l.id,
    weekday: l.weekday,
    startTime: l.startTime,
    durationMin: l.durationMin,
    discipline: pick(locale, l.discipline.nameRu, l.discipline.nameKk),
    trainer: l.trainer ? pick(locale, l.trainer.nameRu, l.trainer.nameKk) : null,
  }));

  const props = { locale, t };

  return (
    <>
      <Header {...props} />
      <main>
        <Hero {...props} />
        <About {...props} />
        <Women {...props} />
        <Disciplines {...props} items={disciplines} />
        <Prices {...props} items={tariffs} />
        {trainers.length > 0 && <Trainers {...props} items={trainers} />}
        {lessons.length > 0 && (
          <ScheduleSection {...props} isDemo={lessons.some((l) => l.isDemo)}>
            <Schedule lessons={lessonViews} labels={t.schedule} />
          </ScheduleSection>
        )}
        <Rating {...props} />
        <Contacts {...props} />
      </main>
      <Footer {...props} />
      <MobileBar {...props} />
    </>
  );
}
