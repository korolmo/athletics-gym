import { notFound } from "next/navigation";
import { getPriceListAndTrainers, getSitePhotos } from "@/modules/home";
import { getSiteSettings } from "@/modules/site";
import { listPublishedReviews } from "@/modules/reviews";
import { listVisibleDirections } from "@/modules/directions";
import { toDirectionViews } from "@/modules/directions/client";
import { isSafeSourceUrl } from "@/modules/reviews/client";
import { buildGymJsonLd, jsonLdScript, readSeoEnv } from "@/lib/seo";
import { getClubOnce, getSiteDictionary, logosFor } from "@/app/brand";
import { listHallLogos } from "@/modules/tariffs";
import { ContactTracker } from "@/components/site/ContactTracker";
import { Motion } from "@/components/site/Motion";
import { mediaUrl } from "@/modules/photos";
import { resolveCodeChannel } from "@/modules/clients";
import { toSiteContent } from "@/modules/site/client";
import { isLocale, pick, type Locale } from "@/lib/i18n";
import {
  About,
  Contacts,
  Directions,
  Footer,
  Gallery,
  Header,
  Hero,
  Marquee,
  MobileBar,
  Prices,
  Reviews,
  Trainers,
  Women,
} from "@/components/site/sections";
import type { TariffView, TrainerView } from "@/components/site/halls/types";

// Страница статическая: собирается при первом запросе и лежит в кэше. Данные меняет Владелец —
// каждое сохранение в админке сбрасывает кэш обоих языков (revalidateSite), поэтому правка видна сразу.
// Час — запасной срок на случай, если сброс не дошёл. Всё, что зависит от запроса (метка формы отзыва,
// счётчик Обращений), идёт отдельными запросами и в страницу не запекается.
export const revalidate = 3600;

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
  const [t, club] = await Promise.all([getSiteDictionary(locale), getClubOnce()]);

  const [{ hallTariffs, trainers: trainerRows }, { settings, cards }, photos, publishedReviews, directionRows] = await Promise.all([
    getPriceListAndTrainers(),
    getSiteSettings(),
    getSitePhotos(),
    listPublishedReviews(),
    listVisibleDirections(),
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

  const logos = logosFor(club, await listHallLogos());
  const props = { locale, t, s, logos };
  // Кнопка «Кабинет» — только где вход работает (Лаборатория); на боевом сайте канала доставки кода нет
  const cabinet = resolveCodeChannel() !== null;
  const directions = toDirectionViews(locale, directionRows, mediaUrl);
  // Разметка зала для поисковиков — из Настроек сайта; рейтинг 2ГИС и Отзывы в неё не входят (см. buildGymJsonLd)
  const jsonLd = buildGymJsonLd({
    siteUrl: readSeoEnv().siteUrl,
    locale,
    name: club.name,
    description: t.seo.description,
    city: t.contacts.city,
    coords: club.latitude !== null && club.longitude !== null ? { lat: club.latitude, lng: club.longitude } : null,
    logoPath: logos.jsonLdPath,
    extraLinks: club.twoGisUrl ? [club.twoGisUrl] : [],
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
      <Motion />
      <Header {...props} hasDirections={directions.length > 0} cabinet={cabinet} />
      <main className="w-full bg-background pt-16 md:pt-20">
        <Hero {...props} photo={photos.hero} />
        {s.show.marquee && s.marquee.length > 0 && <Marquee items={s.marquee} />}
        {s.show.about && <About {...props} />}
        {/* Без видимых Направлений блока нет */}
        {s.show.directions && directions.length > 0 && <Directions {...props} directions={directions} />}
        {s.show.women && <Women {...props} photo={photos.women} />}
        {s.show.prices && <Prices {...props} tariffs={tariffs} trainers={trainers} posters={photos.posters} />}
        {s.show.gallery && <Gallery {...props} photos={gallery} />}
        {s.show.trainers && <Trainers {...props} trainers={trainers} />}
        {/* Придуманных и демо-отзывов нет: пока опубликованных нет, от Блока остаются рейтинг 2ГИС и «Оставить отзыв» */}
        {s.show.reviews && <Reviews {...props} reviews={reviews} />}
        {s.show.contacts && <Contacts {...props} />}
      </main>
      <Footer {...props} cabinet={cabinet} />
      <MobileBar {...props} />
    </>
  );
}
