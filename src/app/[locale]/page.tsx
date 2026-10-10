import { notFound } from "next/navigation";
import { getPriceListAndTrainers, getSitePhotos, getSiteSettings } from "@/lib/services/site";
import { listPublishedReviews } from "@/lib/services/reviews";
import { isSafeSourceUrl } from "@/lib/domain/review";
import { issueFormToken } from "@/lib/reviews/form-token";
import { buildGymJsonLd, jsonLdScript, readSeoEnv } from "@/lib/seo";
import { site } from "@/lib/site";
import { logoIconUrl } from "@/lib/brand";
import { ContactTracker } from "@/components/site/ContactTracker";
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
  Reviews,
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

  const [{ hallTariffs, trainers: trainerRows }, { settings, cards }, photos, publishedReviews] = await Promise.all([
    getPriceListAndTrainers(),
    getSiteSettings(),
    getSitePhotos(),
    listPublishedReviews(),
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
  // Разметка зала для поисковиков — из Настроек сайта; рейтинг 2ГИС и Отзывы в неё не входят (см. buildGymJsonLd)
  const jsonLd = buildGymJsonLd({
    siteUrl: readSeoEnv().siteUrl,
    locale,
    name: site.name,
    description: t.seo.description,
    city: t.contacts.city,
    coords: site.coords,
    logoPath: logoIconUrl.split("?")[0],
    extraLinks: [site.twoGis],
    content: s,
  });
  // Отзывы: текст — как написан, на обоих языках; дата — на языке страницы
  const reviewDate = new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const reviews = publishedReviews.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    text: r.text,
    rating: Math.min(5, Math.max(1, r.rating)),
    source: r.source,
    sourceUrl: isSafeSourceUrl(r.sourceUrl) ? r.sourceUrl : null,
    date: reviewDate.format(r.reviewedAt),
  }));
  const gallery = photos.gallery.map((g) => ({
    id: g.id,
    url: g.url,
    caption: g.captionRu ? pick(locale, g.captionRu, g.captionKk) : null,
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <ContactTracker locale={locale} />
      <Header {...props} />
      <main className="w-full bg-background pt-16 md:pt-20">
        <Hero {...props} photo={photos.hero} />
        {s.show.about && <About {...props} />}
        {s.show.directions && <Directions {...props} />}
        {s.show.women && <Women {...props} photo={photos.women} />}
        {s.show.prices && <Prices {...props} tariffs={tariffs} trainers={trainers} posters={photos.posters} />}
        {s.show.gallery && <Gallery {...props} photos={gallery} />}
        {s.show.trainers && <Trainers {...props} trainers={trainers} />}
        {/* Придуманных и демо-отзывов нет: пока опубликованных нет, от Блока остаются рейтинг 2ГИС и «Оставить отзыв» */}
        {s.show.reviews && (
          <Reviews {...props} reviews={reviews} formToken={issueFormToken(process.env.AUTH_SECRET)} />
        )}
        {s.show.contacts && <Contacts {...props} />}
      </main>
      <Footer {...props} />
      <MobileBar {...props} />
    </>
  );
}
