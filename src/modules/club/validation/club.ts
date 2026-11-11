import { z } from "zod";
import { text } from "@/lib/admin/form";
import { fail, intFromText, toParsed, type Parsed } from "@/lib/validation/shared";
import { accentPalette } from "../domain/accent";

// Форма «Клуб» раздела «Сайт» (этап П1, решение 13). RU обязателен, KZ необязателен: пусто → null, на /kk — RU.
// Пояса в форме нет: его смена сдвигает Записи (П2).

export const CLUB_LIMITS = { name: 60, city: 60, cityIn: 80, seo: 300, url: 300 } as const;

/** Что делать с логотипом: исходный файл, монограмма или оставить загруженное Фото как есть. */
export const LOGO_MODES = ["file", "monogram", "photo"] as const;
export type LogoMode = (typeof LOGO_MODES)[number];

const ru = (name: string, max: number, min = 1) =>
  z
    .string()
    .min(min, { error: min > 1 ? `«${name}» — не короче ${min} символов` : `Заполните поле «${name}»` })
    .max(max, { error: `«${name}» — не длиннее ${max} символов` });
const kk = (name: string, max: number) =>
  z
    .string()
    .max(max, { error: `«${name}» (KZ) — не длиннее ${max} символов` })
    .transform((v) => v || null);

/** Ссылка 2ГИС: пусто — нет ссылки; иначе только https://2gis.… — на сайте она станет кнопкой. */
const twoGis = (name: string) =>
  z.string().transform((raw, ctx) => {
    if (raw === "") return null;
    if (raw.length > CLUB_LIMITS.url) return fail(ctx, `«${name}» — не длиннее ${CLUB_LIMITS.url} символов`);
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" && /(^|\.)2gis\.[a-z]+$/.test(u.hostname)) return raw;
    } catch {
      // ниже — общая ошибка
    }
    return fail(ctx, `«${name}»: нужна ссылка на 2ГИС, начинается с https://2gis.`);
  });

const coord = (name: string, limit: number) =>
  z.string().transform((raw, ctx) => {
    if (raw === "") return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) && Math.abs(n) <= limit ? n : fail(ctx, `«${name}» — число от −${limit} до ${limit}`);
  });

export const clubSchema = z
  .object({
    name: ru("Название", CLUB_LIMITS.name),
    cityRu: ru("Город", CLUB_LIMITS.city),
    cityKk: kk("Город", CLUB_LIMITS.city),
    cityInRu: ru("В каком городе", CLUB_LIMITS.cityIn),
    cityInKk: kk("В каком городе", CLUB_LIMITS.cityIn),
    seoDescriptionRu: ru("Описание для поиска", CLUB_LIMITS.seo, 50),
    seoDescriptionKk: kk("Описание для поиска", CLUB_LIMITS.seo),
    foundedYear: intFromText.refine((y) => y === null || (Number.isInteger(y) && y >= 1900 && y <= new Date().getFullYear()), {
      error: "Год открытия — четыре цифры, не позже текущего года",
    }),
    accentColor: z.string().transform((raw, ctx) => {
      const r = accentPalette(raw);
      return r.ok ? r.palette.accent : fail(ctx, r.error);
    }),
    logoMode: z.enum(LOGO_MODES, { error: "Выберите логотип" }),
    twoGisUrl: twoGis("Карточка в 2ГИС"),
    twoGisReviewsUrl: twoGis("Отзывы в 2ГИС"),
    twoGisRouteUrl: twoGis("Маршрут в 2ГИС"),
    latitude: coord("Широта", 90),
    longitude: coord("Долгота", 180),
  })
  .refine((d) => (d.latitude === null) === (d.longitude === null), { error: "Точка на карте — нужны и широта, и долгота (или ни одной)" });
export type ClubInput = z.output<typeof clubSchema>;


const FORM_FIELDS = ["name", "cityRu", "cityKk", "cityInRu", "cityInKk", "seoDescriptionRu", "seoDescriptionKk", "foundedYear", "accentColor", "logoMode", "twoGisUrl", "twoGisReviewsUrl", "twoGisRouteUrl", "latitude", "longitude"] as const;

export function parseClubForm(fd: FormData): Parsed<ClubInput> {
  const raw = Object.fromEntries(FORM_FIELDS.map((k) => [k, text(fd, k)]));
  return toParsed(clubSchema.safeParse(raw));
}
