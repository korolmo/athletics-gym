import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDictionary, isLocale, pick, type Locale } from "@/lib/i18n";
import {
  About,
  Contacts,
  Directions,
  Footer,
  Gallery,
  Header,
  Hero,
  MobileBar,
  Prices,
  Trainers,
  Women,
} from "@/components/site/sections";
import type { TariffView, TrainerView } from "@/components/site/HallBoards";

// Данные меняет Владелец — всегда читаем свежие из базы
export const dynamic = "force-dynamic";

type TariffRow = {
  id: string;
  hallId: string;
  category: string;
  titleRu: string | null;
  titleKk: string | null;
  visitsPerMonth: number | null;
  durationMonths: number | null;
  access: string;
  audience: string;
  price: number;
  priceTo: number | null;
};

function toTariffView(locale: Locale, x: TariffRow): TariffView {
  return {
    id: x.id,
    hallId: x.hallId,
    category: x.category,
    title: x.titleRu ? pick(locale, x.titleRu, x.titleKk) : null,
    visitsPerMonth: x.visitsPerMonth,
    durationMonths: x.durationMonths,
    access: x.access,
    audience: x.audience,
    price: x.price,
    priceTo: x.priceTo,
  };
}

const tariffOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [hallTariffs, trainerRows] = await Promise.all([
    // Позиции прайса Залов; Тарифы Тренеров приходят вместе с Тренерами
    db.tariff.findMany({ where: { isVisible: true, trainerId: null }, orderBy: tariffOrder }),
    db.trainer.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { tariffs: { where: { isVisible: true }, orderBy: tariffOrder } },
    }),
  ]);

  const tariffs = hallTariffs.map((x) => toTariffView(locale, x));
  const trainers: TrainerView[] = trainerRows.map((tr) => ({
    id: tr.id,
    name: tr.name,
    hallId: tr.hallId,
    photo: tr.photo,
    description: tr.descriptionRu ? pick(locale, tr.descriptionRu, tr.descriptionKk) : null,
    tariffs: tr.tariffs.map((x) => toTariffView(locale, x)),
  }));

  const props = { locale, t };

  return (
    <>
      <Header {...props} />
      <main className="w-full bg-background pt-16 md:pt-20">
        <Hero {...props} />
        <About {...props} />
        <Directions {...props} />
        <Women {...props} />
        <Prices {...props} tariffs={tariffs} trainers={trainers} />
        <Gallery {...props} />
        <Trainers {...props} trainers={trainers} />
        <Contacts {...props} />
      </main>
      <Footer {...props} />
      <MobileBar {...props} />
    </>
  );
}
