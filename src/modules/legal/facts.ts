// Числа, которые называют юридические страницы, — из тех же констант, по которым работает код:
// поменяли срок или лимит в коде — текст документа изменится сам, а не разойдётся с сайтом.

import { ATTEMPT_KEEP_MS } from "@/modules/owner/client";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/modules/owner/client";
import { MAX_SUBMISSIONS, REVIEW_LIMITS, SUBMISSION_KEEP_MS } from "@/modules/reviews/client";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_SEC } from "@/lib/locale-cookie";
import {
  CLIENT_SESSION_COOKIE,
  CLIENT_SESSION_MAX_AGE_SEC,
  CODE_KEEP_MS,
  CODE_TTL_MS,
  INACTIVE_DELETE_MS,
  MAX_CODES_PER_PHONE,
  PHONE_WINDOW_MS,
} from "@/modules/clients/client";
import { CLIENT_CANCEL_DEADLINE_MS, MAX_FUTURE_BOOKINGS } from "@/modules/bookings/client";

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
  // Личный кабинет Клиента (этап 1)
  clientCookie: CLIENT_SESSION_COOKIE,
  clientCookieDays: CLIENT_SESSION_MAX_AGE_SEC / DAY_SEC,
  /** Сколько минут действует код входа */
  codeTtlMin: CODE_TTL_MS / 60_000,
  /** Через сколько суток удаляются записи о кодах входа (хэш кода, номер, хэш адреса) */
  codeKeepDays: CODE_KEEP_MS / DAY_MS,
  codesPerPhone: MAX_CODES_PER_PHONE,
  /** За сколько минут считается лимит кодов на номер */
  codesWindowMin: PHONE_WINDOW_MS / 60_000,
  /** Через сколько месяцев без входа аккаунт удаляется */
  inactiveMonths: Math.round(INACTIVE_DELETE_MS / (30.4 * DAY_MS)),
  maxFutureBookings: MAX_FUTURE_BOOKINGS,
  cancelHours: CLIENT_CANCEL_DEADLINE_MS / (60 * 60 * 1000),
} as const;

/** 1 → «one», 2–4 → «few», 5+ → «many»: «1 год», «2 года», «7 дней». */
export function ruPlural(n: number, [one, few, many]: readonly [string, string, string]): string {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return one;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}
