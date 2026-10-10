import { z } from "zod";
import { text } from "@/lib/admin/form";
import {
  OWNER_STATUSES,
  REVIEW_LIMITS,
  REVIEW_SOURCES,
  containsLink,
  normalizeSourceUrl,
  parseReviewDate,
} from "@/lib/domain/review";
import { HALLS } from "@/lib/domain/tariff";
import { fail, toParsed, type Parsed } from "./shared";

const { nameMax, textMin, textMax, urlMax } = REVIEW_LIMITS;

/** Зал необязателен: пусто → null. */
const hall = z.string().transform((raw, ctx) => {
  if (raw === "") return null;
  return (HALLS as readonly string[]).includes(raw) ? (raw as (typeof HALLS)[number]) : fail(ctx, "hall");
});

const rating = z.string().transform((raw, ctx) => {
  const n = Number(raw);
  return /^[1-5]$/.test(raw) ? n : fail(ctx, "rating");
});

// ——— Отзыв Посетителя с сайта ———

/**
 * Ошибки — кодами: форма на сайте двуязычная, текст ошибки берётся из словаря по коду.
 * Телефон и email не собираем: полей для них нет.
 */
export const VISITOR_REVIEW_ERRORS = ["name", "nameLong", "rating", "textShort", "textLong", "link", "hall"] as const;
export type VisitorReviewError = (typeof VISITOR_REVIEW_ERRORS)[number];

export const visitorReviewSchema = z.object({
  authorName: z
    .string()
    .min(1, { error: "name" })
    .max(nameMax, { error: "nameLong" })
    .refine((v) => !containsLink(v), { error: "link" }),
  rating,
  text: z
    .string()
    .min(textMin, { error: "textShort" })
    .max(textMax, { error: "textLong" })
    .refine((v) => !containsLink(v), { error: "link" }),
  hallId: hall,
});
export type VisitorReviewInput = z.output<typeof visitorReviewSchema>;

export function parseVisitorReview(fd: FormData): { ok: true; data: VisitorReviewInput } | { ok: false; error: VisitorReviewError } {
  const result = visitorReviewSchema.safeParse({
    authorName: text(fd, "authorName"),
    rating: text(fd, "rating"),
    text: text(fd, "text"),
    hallId: text(fd, "hallId"),
  });
  if (result.success) return { ok: true, data: result.data };
  const code = result.error.issues[0]?.message;
  return { ok: false, error: (VISITOR_REVIEW_ERRORS as readonly string[]).includes(code ?? "") ? (code as VisitorReviewError) : "textShort" };
}

// ——— Отзыв, который Владелец добавляет вручную ———

export function ownerReviewSchema(now: Date) {
  return z.object({
    id: z.string().transform((v) => v || null),
    authorName: z
      .string()
      .min(1, { error: "Заполните имя автора" })
      .max(nameMax, { error: `Имя автора — не длиннее ${nameMax} символов` }),
    text: z
      .string()
      .min(1, { error: "Заполните текст отзыва" })
      .max(textMax, { error: `Текст отзыва — не длиннее ${textMax} символов` }),
    rating: z.string().transform((raw, ctx) => (/^[1-5]$/.test(raw) ? Number(raw) : fail(ctx, "Оценка — от 1 до 5"))),
    hallId: z.string().transform((raw, ctx) => {
      if (raw === "") return null;
      return (HALLS as readonly string[]).includes(raw) ? (raw as (typeof HALLS)[number]) : fail(ctx, "Выберите зал");
    }),
    source: z.enum(REVIEW_SOURCES, { error: "Выберите источник отзыва" }),
    /** Только https; пусто → null */
    sourceUrl: z.string().transform((raw, ctx) => {
      if (raw === "") return null;
      if (raw.length > urlMax) return fail(ctx, `Ссылка на оригинал — не длиннее ${urlMax} символов`);
      return normalizeSourceUrl(raw) ?? fail(ctx, "Ссылка на оригинал: нужен адрес, который начинается с https://");
    }),
    reviewedAt: z
      .string()
      .transform((raw, ctx) => parseReviewDate(raw, now) ?? fail(ctx, "Дата отзыва: выберите день не позже сегодняшнего")),
    status: z.enum(OWNER_STATUSES, { error: "Выберите, показывать ли отзыв на сайте" }),
  });
}
export type OwnerReviewInput = z.output<ReturnType<typeof ownerReviewSchema>>;

export function parseOwnerReviewForm(fd: FormData, now: Date = new Date()): Parsed<OwnerReviewInput> {
  return toParsed(
    ownerReviewSchema(now).safeParse({
      id: text(fd, "id"),
      authorName: text(fd, "authorName"),
      text: text(fd, "text"),
      rating: text(fd, "rating"),
      hallId: text(fd, "hallId"),
      source: text(fd, "source"),
      sourceUrl: text(fd, "sourceUrl"),
      reviewedAt: text(fd, "reviewedAt"),
      // Галочка «Показывать на сайте»: ручной Отзыв по умолчанию сразу опубликован
      status: fd.get("isVisible") === "on" ? "PUBLISHED" : "HIDDEN",
    }),
  );
}
