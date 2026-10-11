import { z } from "zod";
import { text } from "@/lib/admin/form";
import { LIMITS } from "@/lib/admin/limits";
import {
  ABOUT_CARD_COUNT,
  MARQUEE_MAX_ITEMS,
  MARQUEE_PLACEHOLDERS,
  hasUnknownPlaceholder,
  normalizeInstagram,
  normalizePhoneDigits,
  parseRating,
} from "@/lib/domain/site-settings";
import { fail, toParsed, type Parsed } from "./shared";

// Формы раздела «Сайт». RU обязателен, KZ необязателен: пустое поле → null, на /kk покажем RU.

function ruText(name: string, max: number) {
  return z
    .string()
    .min(1, { error: `Заполните поле «${name}» на русском` })
    .max(max, { error: `«${name}» — не длиннее ${max} символов` });
}

function kkText(name: string, max: number) {
  return z
    .string()
    .max(max, { error: `«${name}» (KZ) — не длиннее ${max} символов` })
    .transform((v) => v || null);
}

function instagram(name: string) {
  return z.string().transform((raw, ctx) => {
    if (raw === "") return fail(ctx, `Укажите ${name}`);
    return normalizeInstagram(raw) ?? fail(ctx, `${name}: нужна ссылка на профиль или имя, например @athletics_gym`);
  });
}

/** Первый экран: девиз и подзаголовок. */
export const heroSchema = z.object({
  heroTitleRu: ruText("Девиз", LIMITS.motto),
  heroTitleKk: kkText("Девиз", LIMITS.motto),
  heroSubtitleRu: ruText("Подзаголовок", LIMITS.subtitle),
  heroSubtitleKk: kkText("Подзаголовок", LIMITS.subtitle),
});
export type HeroInput = z.output<typeof heroSchema>;

const aboutCardSchema = z.object({
  kickerRu: ruText("Подпись", LIMITS.cardKicker),
  kickerKk: kkText("Подпись", LIMITS.cardKicker),
  titleRu: ruText("Заголовок", LIMITS.cardTitle),
  titleKk: kkText("Заголовок", LIMITS.cardTitle),
  textRu: ruText("Текст", LIMITS.cardText),
  textKk: kkText("Текст", LIMITS.cardText),
});

/** «О зале»: ровно четыре карточки, по порядку. */
export const aboutSchema = z.object({ cards: z.array(aboutCardSchema).length(ABOUT_CARD_COUNT) });
export type AboutInput = z.output<typeof aboutSchema>;

/** Женский зал: текст и Instagram. */
export const womenSchema = z.object({
  womenTextRu: ruText("Текст", LIMITS.womenText),
  womenTextKk: kkText("Текст", LIMITS.womenText),
  womenInstagram: instagram("Instagram Женского зала"),
});
export type WomenInput = z.output<typeof womenSchema>;

const PHONE_HINT = "нужен казахстанский номер, например +7 771 484 63 44";

/** Контакты: адрес, часы работы, телефон, номер WhatsApp, Instagram зала. */
export const contactsSchema = z.object({
  addressRu: ruText("Адрес", LIMITS.address),
  addressKk: kkText("Адрес", LIMITS.address),
  hoursRu: ruText("Часы работы", LIMITS.hours),
  hoursKk: kkText("Часы работы", LIMITS.hours),
  /** В базе — +7 и десять цифр */
  phone: z.string().transform((raw, ctx) => {
    const digits = normalizePhoneDigits(raw);
    return digits ? `+${digits}` : fail(ctx, `Телефон: ${PHONE_HINT}`);
  }),
  /** В базе — одиннадцать цифр, начиная с 7, как в ссылке wa.me */
  whatsapp: z.string().transform((raw, ctx) => normalizePhoneDigits(raw) ?? fail(ctx, `Номер WhatsApp: ${PHONE_HINT}`)),
  instagram: instagram("Instagram зала"),
});
export type ContactsInput = z.output<typeof contactsSchema>;

/** Рейтинг 2ГИС: оценка от 1 до 5 с одним знаком после запятой и число оценок. */
export const ratingSchema = z.object({
  ratingTenths: z
    .string()
    .transform((raw, ctx) => parseRating(raw) ?? fail(ctx, "Оценка — число от 1 до 5, например 4,9")),
  ratingCount: z.string().transform((raw, ctx) => {
    const n = Number(raw.replace(/\s/g, ""));
    if (raw === "" || !Number.isInteger(n) || n < 0) return fail(ctx, "Число оценок — целое число от 0");
    if (n > LIMITS.ratingCount) return fail(ctx, `Число оценок — не больше ${LIMITS.ratingCount}`);
    return n;
  }),
});
export type RatingInput = z.output<typeof ratingSchema>;

/** Бегущая строка: от одного до восьми пунктов; списки RU и KZ одной длины, пустой казахский пункт — «как на русском». */
export type MarqueeInput = { marqueeRu: string[]; marqueeKk: string[] };

function fields<K extends string>(fd: FormData, keys: readonly K[]): Record<K, string> {
  return Object.fromEntries(keys.map((k) => [k, text(fd, k)])) as Record<K, string>;
}

export function parseHeroForm(fd: FormData): Parsed<HeroInput> {
  return toParsed(heroSchema.safeParse(fields(fd, ["heroTitleRu", "heroTitleKk", "heroSubtitleRu", "heroSubtitleKk"])));
}

/** Поля карточек в форме называются `card<место>.<поле>`: card1.titleRu … card4.textKk. */
export function parseAboutForm(fd: FormData): Parsed<AboutInput> {
  const cards = Array.from({ length: ABOUT_CARD_COUNT }, (_, i) => {
    const key = (name: string) => text(fd, `card${i + 1}.${name}`);
    return {
      kickerRu: key("kickerRu"),
      kickerKk: key("kickerKk"),
      titleRu: key("titleRu"),
      titleKk: key("titleKk"),
      textRu: key("textRu"),
      textKk: key("textKk"),
    };
  });
  const result = aboutSchema.safeParse({ cards });
  if (result.success) return { ok: true, data: result.data };
  // В сообщении называем карточку: полей с одинаковыми именами четыре
  const issue = result.error.issues[0];
  const index = typeof issue?.path[1] === "number" ? issue.path[1] + 1 : null;
  const message = issue?.message ?? "Проверьте поля формы";
  return { ok: false, error: index ? `Карточка ${index}. ${message}` : message };
}

/**
 * Поля формы — `marquee<номер>Ru` и `marquee<номер>Kk`, номера с 1. Пустые строки формы пропускаются,
 * порядок остальных сохраняется. В сообщении называем номер строки формы: одинаковых полей восемь.
 */
export function parseMarqueeForm(fd: FormData): Parsed<MarqueeInput> {
  const max = LIMITS.marqueeItem;
  const allowed = Object.values(MARQUEE_PLACEHOLDERS).join(" и ");
  const marqueeRu: string[] = [];
  const marqueeKk: string[] = [];
  for (let n = 1; n <= MARQUEE_MAX_ITEMS; n++) {
    const ru = text(fd, `marquee${n}Ru`);
    const kk = text(fd, `marquee${n}Kk`);
    if (!ru && !kk) continue;
    if (!ru) return { ok: false, error: `Пункт ${n}. Заполните текст на русском` };
    for (const [value, lang] of [[ru, ""], [kk, " (KZ)"]] as const) {
      if (value.length > max) return { ok: false, error: `Пункт ${n}${lang} — не длиннее ${max} символов` };
      if (hasUnknownPlaceholder(value)) {
        return { ok: false, error: `Пункт ${n}${lang}. В фигурных скобках — только ${allowed}` };
      }
    }
    marqueeRu.push(ru);
    marqueeKk.push(kk);
  }
  if (marqueeRu.length === 0) {
    return { ok: false, error: "Нужен хотя бы один пункт. Чтобы убрать ленту с сайта, скройте её в списке блоков" };
  }
  return { ok: true, data: { marqueeRu, marqueeKk } };
}

export function parseWomenForm(fd: FormData): Parsed<WomenInput> {
  return toParsed(womenSchema.safeParse(fields(fd, ["womenTextRu", "womenTextKk", "womenInstagram"])));
}

export function parseContactsForm(fd: FormData): Parsed<ContactsInput> {
  return toParsed(
    contactsSchema.safeParse(
      fields(fd, ["addressRu", "addressKk", "hoursRu", "hoursKk", "phone", "whatsapp", "instagram"]),
    ),
  );
}

export function parseRatingForm(fd: FormData): Parsed<RatingInput> {
  return toParsed(ratingSchema.safeParse(fields(fd, ["ratingTenths", "ratingCount"])));
}
