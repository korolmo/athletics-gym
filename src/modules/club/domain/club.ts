// Клуб (этап П1, ADR 0018): модель и начальные значения — чистый код, без базы.

export type ClubData = {
  name: string;
  cityRu: string;
  cityKk: string | null;
  seoDescriptionRu: string;
  seoDescriptionKk: string | null;
  foundedYear: number | null;
  /** #rrggbb */
  accentColor: string;
  logoPhoto: string | null;
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
  seoDescriptionRu:
    "Спортзал в Кызылорде: тренажёрный зал с новыми тренажёрами, отдельный женский зал, персональные тренировки с тренером. Первое посещение бесплатно.",
  seoDescriptionKk: "Қызылордадағы спорт зал: жаңа тренажерлар, бөлек әйелдер залы, жаттықтырушымен жеке жаттығулар. Алғашқы келу тегін.",
  foundedYear: 2022,
  accentColor: "#f5e642",
  logoPhoto: null,
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
  seoDescriptionRu: true,
  seoDescriptionKk: true,
  foundedYear: true,
  accentColor: true,
  logoPhoto: true,
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
