// Как Отзывы называются в админке (она только на русском). Подписи для сайта — в src/dictionaries.
import type { ReviewSource, ReviewStatus } from "@/lib/domain/review";

export const REVIEW_SOURCE_LABEL_RU: Record<ReviewSource, string> = {
  SITE: "Сайт",
  TWOGIS: "2ГИС",
  INSTAGRAM: "Instagram",
  GOOGLE: "Google",
  OTHER: "Другое",
};

export const REVIEW_STATUS_LABEL_RU: Record<ReviewStatus, string> = {
  NEW: "Новый",
  PUBLISHED: "Опубликован",
  HIDDEN: "Скрыт",
};

/** «9 октября 2026» */
export function formatReviewDateRu(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
