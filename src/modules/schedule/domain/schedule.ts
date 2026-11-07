// Окна Тренера (GLOSSARY, ADR 0017): не хранятся, а вычисляются — часы работы минус исключения минус занятое время.
// Чистые функции, без базы. Часы работы и исключения — в поясе Клуба, моменты — в UTC.
import { CLUB_TIME_ZONE, addDays, isDay, weekdayOf, zonedParts, zonedToUtc, type Day } from "@/lib/time";

/** Длительность тренировки: от 30 минут до 3 часов, шаг 15 минут. По умолчанию — час. */
export const SESSION_MINUTES_MIN = 30;
export const SESSION_MINUTES_MAX = 180;
export const SESSION_MINUTES_STEP = 15;
export const DEFAULT_SESSION_MINUTES = 60;

/** Не больше 4 интервалов работы в день. */
export const MAX_INTERVALS_PER_DAY = 4;

/** Записаться можно на 14 дней вперёд, не раньше чем за 2 часа до начала. */
export const BOOKING_HORIZON_DAYS = 14;
export const MIN_LEAD_MS = 2 * 60 * 60 * 1000;

/** Исключение — не длиннее 90 дней. */
export const MAX_TIME_OFF_DAYS = 90;

/** Интервал работы Тренера в один из дней недели: минуты от полуночи, конец не включается. */
export type WorkInterval = { weekday: number; startMin: number; endMin: number };

/** Исключение: дни (включительно), когда Тренер не принимает записи. */
export type TimeOff = { fromDay: Day; toDay: Day };

/** Занятое время — уже сделанные Записи (их передаёт слой приложения из модуля Записи). */
export type Busy = { start: Date; end: Date };

export type Window = { start: Date; end: Date };

export type TrainerSchedule = { sessionMinutes: number; workHours: WorkInterval[]; timeOff: TimeOff[] };

export type WeekError = "sessionMinutes" | "interval" | "overlap" | "tooMany" | "tooShort";

export function isValidSessionMinutes(n: number): boolean {
  return Number.isInteger(n) && n >= SESSION_MINUTES_MIN && n <= SESSION_MINUTES_MAX && n % SESSION_MINUTES_STEP === 0;
}

/**
 * Проверяет недельный шаблон: интервалы внутри суток, начало раньше конца, в интервал помещается хотя бы одна
 * тренировка, интервалы одного дня не пересекаются, их не больше MAX_INTERVALS_PER_DAY.
 */
export function checkWeek(sessionMinutes: number, intervals: WorkInterval[]): WeekError | null {
  if (!isValidSessionMinutes(sessionMinutes)) return "sessionMinutes";
  for (const i of intervals) {
    if (!Number.isInteger(i.weekday) || i.weekday < 1 || i.weekday > 7) return "interval";
    if (!Number.isInteger(i.startMin) || !Number.isInteger(i.endMin)) return "interval";
    if (i.startMin < 0 || i.endMin > 24 * 60 || i.startMin >= i.endMin) return "interval";
    if (i.endMin - i.startMin < sessionMinutes) return "tooShort";
  }
  for (let d = 1; d <= 7; d++) {
    const day = intervals.filter((i) => i.weekday === d).sort((a, b) => a.startMin - b.startMin);
    if (day.length > MAX_INTERVALS_PER_DAY) return "tooMany";
    for (let k = 1; k < day.length; k++) if (day[k].startMin < day[k - 1].endMin) return "overlap";
  }
  return null;
}

/** Исключение: оба дня настоящие, начало не позже конца, не длиннее MAX_TIME_OFF_DAYS. */
export function isValidTimeOff(t: TimeOff): boolean {
  if (!isDay(t.fromDay) || !isDay(t.toDay) || t.fromDay > t.toDay) return false;
  return addDays(t.fromDay, MAX_TIME_OFF_DAYS - 1) >= t.toDay;
}

function isOff(day: Day, timeOff: TimeOff[]): boolean {
  return timeOff.some((t) => t.fromDay <= day && day <= t.toDay);
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Свободные Окна Тренера с сегодняшнего дня Клуба на `days` дней вперёд.
 * Окна идут от начала каждого интервала с шагом в длительность тренировки; окно, которое не помещается целиком
 * в интервал, начинается раньше чем через MIN_LEAD_MS или пересекается с занятым временем, не показывается.
 */
export function computeWindows(
  schedule: TrainerSchedule,
  busy: Busy[],
  now: Date,
  days: number = BOOKING_HORIZON_DAYS,
  timeZone: string = CLUB_TIME_ZONE,
): Window[] {
  const { sessionMinutes, workHours, timeOff } = schedule;
  const earliest = now.getTime() + MIN_LEAD_MS;
  const today = zonedParts(now, timeZone).day;
  const out: Window[] = [];
  for (let n = 0; n < days; n++) {
    const day = addDays(today, n);
    if (isOff(day, timeOff)) continue;
    const weekday = weekdayOf(day);
    const intervals = workHours.filter((i) => i.weekday === weekday).sort((a, b) => a.startMin - b.startMin);
    for (const i of intervals) {
      for (let t = i.startMin; t + sessionMinutes <= i.endMin; t += sessionMinutes) {
        const start = zonedToUtc(day, t, timeZone);
        if (start.getTime() < earliest) continue;
        const window = { start, end: new Date(start.getTime() + sessionMinutes * 60_000) };
        if (busy.some((b) => overlaps(window, b))) continue;
        out.push(window);
      }
    }
  }
  return out;
}

/** Есть ли среди свободных Окон окно, начинающееся ровно в `start` (проверка перед Записью). */
export function isFreeWindow(schedule: TrainerSchedule, busy: Busy[], start: Date, now: Date, timeZone: string = CLUB_TIME_ZONE): boolean {
  return computeWindows(schedule, busy, now, BOOKING_HORIZON_DAYS, timeZone).some((w) => w.start.getTime() === start.getTime());
}
