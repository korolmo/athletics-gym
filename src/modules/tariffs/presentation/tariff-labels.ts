// Как Тарифы показываются в админке: русские подписи, названия из полей, форматирование цен.
// Админка только на русском; подписи сайта на двух языках — в src/dictionaries.
import {
  isAccess,
  isAudience,
  type Access,
  type Audience,
  type Category,
  type HallId,
  type TariffShape,
} from "../domain/tariff";
import { plural } from "@/lib/plural";

export const HALL_LABEL_RU: Record<HallId, string> = {
  general: "Общий зал",
  women: "Женский зал",
};

export const CATEGORY_LABEL_RU: Record<Category, string> = {
  SINGLE: "Разовое посещение",
  VISITS: "Абонемент на посещения",
  UNLIMITED: "Безлимит",
  PERSONAL: "Персональная тренировка",
};

export const ACCESS_LABEL_RU: Record<Access, string> = {
  DAY: "Дневной (08:00–17:00)",
  FULL: "Весь день (08:00–23:00)",
};

export const AUDIENCE_LABEL_RU: Record<Audience, string> = {
  ALL: "Всем",
  STUDENTS: "Студентам",
  WOMEN: "Женщинам",
  MEN: "Мужчинам",
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatPrice(value: number): string {
  return `${formatNumber(value)} ₸`;
}

/** Цена Тарифа: точная или диапазон «от–до». */
export function formatTariffPrice(t: { price: number; priceTo: number | null }): string {
  return t.priceTo && t.priceTo > t.price ? `${formatNumber(t.price)} – ${formatPrice(t.priceTo)}` : formatPrice(t.price);
}


/** Название Тарифа для админки, собранное из полей. */
export function tariffLabelRu(t: TariffShape): string {
  if (t.titleRu) return t.titleRu;
  switch (t.category) {
    case "SINGLE":
      return "Разовое посещение";
    case "VISITS":
      return `${t.visitsPerMonth ?? "?"} ${plural(t.visitsPerMonth ?? 0, ["посещение", "посещения", "посещений"])} в месяц`;
    case "UNLIMITED":
      return `Безлимит, ${t.durationMonths ?? "?"} ${plural(t.durationMonths ?? 0, ["месяц", "месяца", "месяцев"])}`;
    case "PERSONAL":
      return t.visitsPerMonth
        ? `${t.visitsPerMonth} ${plural(t.visitsPerMonth, ["тренировка", "тренировки", "тренировок"])} в месяц`
        : "Разовая тренировка";
    default:
      return t.category;
  }
}

/** Пометки Тарифа для админки: Аудитория и Время доступа. */
export function tariffTagsRu(t: TariffShape): string[] {
  const tags: string[] = [];
  if (isAudience(t.audience) && t.audience !== "ALL") tags.push(AUDIENCE_LABEL_RU[t.audience]);
  if (t.category === "VISITS" && isAccess(t.access)) tags.push(ACCESS_LABEL_RU[t.access]);
  return tags;
}
