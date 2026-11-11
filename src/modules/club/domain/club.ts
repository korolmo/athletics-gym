// Клуб (этап П1, ADR 0018): модель и начальные значения — чистый код, без базы.

export type ClubData = {
  name: string;
  cityRu: string;
  cityKk: string | null;
  /** «в Кызылорде» — для заголовков; склонение не вычисляем */
  cityInRu: string;
  /** «Қызылордадағы» */
  cityInKk: string | null;
  seoDescriptionRu: string;
  seoDescriptionKk: string | null;
  foundedYear: number | null;
  /** #rrggbb */
  accentColor: string;
  /** «/…» — файл из public/, «gallery/…» — Фото, null — монограмма */
  logo: string | null;
  twoGisUrl: string | null;
  twoGisReviewsUrl: string | null;
  twoGisRouteUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  /** IANA-пояс */
  timeZone: string;
};

/** В базе пока одна строка Клуба (П2 добавит другие). */
export const CLUB_ID = "club";

/**
 * Athletic's Gym — те же значения, что вносит миграция `20261111000000_club` (тест на MariaDB сверяет строку с ними).
 * Нужны, когда строки нет (пустая база до миграции), и для суточного сброса Лаборатории (П1, PR 7).
 */
export const DEFAULT_CLUB: ClubData = {
  name: "Athletic's Gym",
  cityRu: "Кызылорда",
  cityKk: "Қызылорда",
  cityInRu: "в Кызылорде",
  cityInKk: "Қызылордадағы",
  seoDescriptionRu:
    "Спортзал в Кызылорде: тренажёрный зал с новыми тренажёрами, отдельный женский зал, персональные тренировки с тренером. Первое посещение бесплатно.",
  seoDescriptionKk: "Қызылордадағы спорт зал: жаңа тренажерлар, бөлек әйелдер залы, жаттықтырушымен жеке жаттығулар. Алғашқы келу тегін.",
  foundedYear: 2022,
  accentColor: "#f5e642",
  logo: "/logo.png?v=2",
  twoGisUrl: "https://2gis.kz/kyzylorda/firm/70000001069365221",
  twoGisReviewsUrl: "https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews",
  twoGisRouteUrl: "https://2gis.kz/kyzylorda/directions/points/%7C65.512295%2C44.784253%3B70000001069365221",
  latitude: 44.784253,
  longitude: 65.512295,
  timeZone: "Asia/Qyzylorda",
};

/** Поля строки базы, которые читает модуль (без служебных id и updatedAt). */
export const CLUB_FIELDS = {
  name: true,
  cityRu: true,
  cityKk: true,
  cityInRu: true,
  cityInKk: true,
  seoDescriptionRu: true,
  seoDescriptionKk: true,
  foundedYear: true,
  accentColor: true,
  logo: true,
  twoGisUrl: true,
  twoGisReviewsUrl: true,
  twoGisRouteUrl: true,
  latitude: true,
  longitude: true,
  timeZone: true,
} as const;

/** Город на языке страницы; казахского нет — русский (как тексты Настроек сайта). */
export function clubCity(club: Pick<ClubData, "cityRu" | "cityKk">, locale: "ru" | "kk"): string {
  return locale === "kk" && club.cityKk ? club.cityKk : club.cityRu;
}

/** Карта OpenStreetMap для «Показать карту» (Контакты): окно вокруг точки Клуба. Нет точки — пусто. */
export function mapEmbedUrl(club: Pick<ClubData, "latitude" | "longitude">): string {
  const { latitude: lat, longitude: lng } = club;
  if (lat === null || lng === null) return "";
  const bbox = [lng - 0.008, lat - 0.004, lng + 0.008, lat + 0.004].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/**
 * Значения меток бренда в словарях ({club}, {city}, {inCity}, {since}…) на языке страницы. `since` — шаблон
 * подписи «· с {year} года» из словаря; года нет — подписи нет. Пустые ссылки 2ГИС — пустая строка.
 */
export function clubTextVars(club: ClubData, locale: "ru" | "kk", since: string) {
  const kk = locale === "kk";
  return {
    club: club.name,
    city: clubCity(club, locale),
    inCity: kk && club.cityInKk ? club.cityInKk : club.cityInRu,
    since: club.foundedYear ? since.replace("{year}", String(club.foundedYear)) : "",
    seoDescription: kk && club.seoDescriptionKk ? club.seoDescriptionKk : club.seoDescriptionRu,
    twoGis: club.twoGisUrl ?? "",
    twoGisReviews: club.twoGisReviewsUrl ?? "",
    twoGisRoute: club.twoGisRouteUrl ?? "",
    mapEmbed: mapEmbedUrl(club),
  };
}
