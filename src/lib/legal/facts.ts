// Числа, которые называют юридические страницы, — из тех же констант, по которым работает код:
// поменяли срок или лимит в коде — текст документа изменится сам, а не разойдётся с сайтом.

import { ATTEMPT_KEEP_MS } from "@/lib/auth/login-limit.rules";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth/session";
import { MAX_SUBMISSIONS, REVIEW_LIMITS, SUBMISSION_KEEP_MS } from "@/lib/domain/review";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_SEC } from "@/lib/locale-cookie";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_SEC = 24 * 60 * 60;

export const LEGAL_FACTS = {
  /** Сколько Отзывов в сутки сайт принимает с одного адреса */
  reviewsPerDay: MAX_SUBMISSIONS,
  reviewTextMin: REVIEW_LIMITS.textMin,
  reviewTextMax: REVIEW_LIMITS.textMax,
  /** Через сколько суток запись об отправке Отзыва (хэш адреса) подлежит удалению */
  submissionKeepDays: SUBMISSION_KEEP_MS / DAY_MS,
  /** То же для неудачных попыток входа в админку */
  loginKeepDays: ATTEMPT_KEEP_MS / DAY_MS,
  localeCookie: LOCALE_COOKIE,
  localeCookieYears: LOCALE_COOKIE_MAX_AGE_SEC / (365 * DAY_SEC),
  sessionCookie: SESSION_COOKIE,
  sessionCookieDays: SESSION_MAX_AGE_SEC / DAY_SEC,
} as const;

/** 1 → «one», 2–4 → «few», 5+ → «many»: «1 год», «2 года», «7 дней». */
export function ruPlural(n: number, [one, few, many]: readonly [string, string, string]): string {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}
