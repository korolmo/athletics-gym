import { notFound } from "next/navigation";
import { getPriceListAndTrainers, getSitePhotos, getSiteSettings } from "@/lib/services/site";
import { mediaUrl } from "@/lib/storage/client";
import { toSiteContent } from "@/lib/domain/site-settings";
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
import type { TariffView, TrainerView } from "@/components/site/halls/types";

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

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [{ hallTariffs, trainers: trainerRows }, { settings, cards }, photos] = await Promise.all([
    getPriceListAndTrainers(),
    getSiteSettings(),
    getSitePhotos(),
  ]);
  // Настройки сайта на языке страницы: тексты, контакты и какие Блоки показывать
  const s = toSiteContent(locale, settings, cards);

  const tariffs = hallTariffs.map((x) => toTariffView(locale, x));
  const trainers: TrainerView[] = trainerRows.map((tr) => ({
    id: tr.id,
    name: tr.name,
    hallId: tr.hallId,
    // Плакат, загруженный Владельцем; пока его нет — прежний файл из public/trainers
    photo: mediaUrl(tr.uploadedPhoto) ?? tr.photo,
    description: tr.descriptionRu ? pick(locale, tr.descriptionRu, tr.descriptionKk) : null,
    tariffs: tr.tariffs.map((x) => toTariffView(locale, x)),
  }));

  const props = { locale, t, s };
  const gallery = photos.gallery.map((g) => ({
    id: g.id,
    url: g.url,
    caption: g.captionRu ? pick(locale, g.captionRu, g.captionKk) : null,
  }));

  return (
    <>
      <Header {...props} />
      <main className="w-full bg-background pt-16 md:pt-20">
        <Hero {...props} photo={photos.hero} />
        {s.show.about && <About {...props} />}
        {s.show.directions && <Directions {...props} />}
        {s.show.women && <Women {...props} photo={photos.women} />}
        {s.show.prices && <Prices {...props} tariffs={tariffs} trainers={trainers} posters={photos.posters} />}
        {s.show.gallery && <Gallery {...props} photos={gallery} />}
        {s.show.trainers && <Trainers {...props} trainers={trainers} />}
        {s.show.contacts && <Contacts {...props} />}
      </main>
      <Footer {...props} />
      <MobileBar {...props} />
    </>
  );
}
