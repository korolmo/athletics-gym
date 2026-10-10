// Отзыв: модель и правила — чистые функции, без базы и запроса.
// Отзывы только реальные: придуманных и демо-отзывов в проекте нет.

/** Источник Отзыва: где он был оставлен. */
export const REVIEW_SOURCES = ["SITE", "TWOGIS", "INSTAGRAM", "GOOGLE", "OTHER"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

/** Статус Отзыва. На сайте видны только опубликованные. */
export const REVIEW_STATUSES = ["NEW", "PUBLISHED", "HIDDEN"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function isReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value);
}

/** Что Владелец может сделать со статусом: опубликовать или скрыть. «Новым» Отзыв бывает только до его решения. */
export const OWNER_STATUSES = ["PUBLISHED", "HIDDEN"] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];

export function isOwnerStatus(value: string): value is OwnerStatus {
  return (OWNER_STATUSES as readonly string[]).includes(value);
}

export const REVIEW_LIMITS = {
  nameMax: 50,
  /** Отзыв Посетителя — не короче: одно слово «норм» мнением не считаем */
  textMin: 10,
  textMax: 1000,
  urlMax: 300,
} as const;

/** Сколько Отзывов видно на сайте сразу; остальные открывает кнопка «Ещё». */
export const REVIEWS_FIRST = 6;
/** Текст длиннее сворачивается и разворачивается по нажатию. */
export const REVIEW_COLLAPSE_AT = 280;

// ——— Ссылки в тексте: так режем спам ———

const LINK =
  /(?:https?:\/\/|www\.|\b[a-z0-9][a-z0-9-]*\.[a-z]{2,}\b|[a-zа-яё0-9-]+\.(?:рф|қаз)(?![а-яёa-z]))/i;

/**
 * Есть ли в тексте ссылка: адрес с http, «www.» или что-то похожее на домен (site.kz, t.me/x, сайт.рф).
 * Отзыв Посетителя со ссылкой не принимается. Обычные сокращения и числа («т.д.», «5.0», «08:00») ссылками не считаются.
 */
export function containsLink(text: string): boolean {
  return LINK.test(text);
}

/** Ссылка на оригинал Отзыва: только правильный https-адрес; иначе null. */
export function normalizeSourceUrl(raw: string): string | null {
  const value = raw.trim();
  if (!/^https:\/\//i.test(value) || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !/^[a-z0-9.-]+\.[a-z0-9-]{2,}$/i.test(url.hostname) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Можно ли подставить адрес в ссылку на сайте: то же правило, что при сохранении. */
export function isSafeSourceUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && normalizeSourceUrl(value) === value;
}

// ——— Антиспам формы на сайте (без капчи) ———

/** Форму нельзя заполнить быстрее: быстрее отправляют только роботы. */
export const MIN_FILL_MS = 3_000;
/** Метка времени формы действует сутки: страница, открытая дольше, должна быть обновлена. */
export const FORM_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Не больше трёх принятых Отзывов с одного адреса за сутки. */
export const MAX_SUBMISSIONS = 3;
export const SUBMISSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SubmissionCheck =
  /** Принять и записать */
  | { verdict: "accept" }
  /** Сработала ловушка: Посетителю показываем обычное «Спасибо», в базу ничего не пишем */
  | { verdict: "trap" }
  /** Отправлено быстрее трёх секунд после открытия страницы */
  | { verdict: "too-fast" }
  /** Метка времени формы отсутствует, подделана или устарела — нужно обновить страницу */
  | { verdict: "stale" }
  /** Исчерпан лимит отправок с этого адреса */
  | { verdict: "limit" };

/**
 * Решение по отправке формы — до проверки самого текста.
 * `honeypot` — значение скрытого поля, которое человек не видит и не заполняет;
 * `elapsedMs` — сколько прошло с открытия страницы (null — метка времени не прошла проверку);
 * `recent` — время уже принятых отправок с этого адреса.
 */
export function checkSubmission(input: { honeypot: string; elapsedMs: number | null; recent: Date[] }, now: Date): SubmissionCheck {
  // Ловушка — первой: роботу не нужно знать, что его распознали
  if (input.honeypot.trim() !== "") return { verdict: "trap" };
  if (input.elapsedMs === null || input.elapsedMs > FORM_TOKEN_MAX_AGE_MS) return { verdict: "stale" };
  if (input.elapsedMs < MIN_FILL_MS) return { verdict: "too-fast" };
  const inWindow = input.recent.filter((d) => now.getTime() - d.getTime() < SUBMISSION_WINDOW_MS);
  if (inWindow.length >= MAX_SUBMISSIONS) return { verdict: "limit" };
  return { verdict: "accept" };
}

/** Дата Отзыва из формы админки («2026-10-09») → полночь UTC; null — не дата или дата из будущего. */
export function parseReviewDate(raw: string, now: Date): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return null;
  // День в Кызылорде наступает раньше, чем по UTC, — «сегодня» считаем с запасом в сутки
  if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) return null;
  return date;
}

/** Сегодняшний день в зале (Кызылорда, UTC+5) как дата Отзыва — полночь UTC этого дня. */
export function todayInGym(now: Date): Date {
  const local = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return new Date(`${local.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/** «2026-10-09» для поля даты в форме. */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
