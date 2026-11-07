// Показ времени Записей в кабинете — в поясе Клуба (src/lib/time). Чистые функции: и на сервере, и в браузере.
import { formatClock, weekdayOf, zonedParts, type Day } from "@/lib/time";
import type { CabinetDictionary } from "@/dictionaries/cabinet/ru";

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** «12», «НОЯ», «ВТ» — плашка даты в карточке Записи. */
export function dateBlock(at: Date, t: CabinetDictionary) {
  const { day } = zonedParts(at);
  const [, m, d] = day.split("-").map(Number);
  return { day: String(d), month: t.months[m - 1].toUpperCase(), weekday: t.weekdays[weekdayOf(day) - 1] };
}

/** «19:00–20:00» */
export function timeRange(start: Date, end: Date): string {
  return `${formatClock(zonedParts(start).minutes)}–${formatClock(zonedParts(end).minutes)}`;
}

/** «19:00» */
export function clock(at: Date): string {
  return formatClock(zonedParts(at).minutes);
}

/** «Вт, 11 ноября» */
export function longDay(day: Day, t: CabinetDictionary): string {
  const [, m, d] = day.split("-").map(Number);
  const wd = t.weekdays[weekdayOf(day) - 1];
  return `${wd.charAt(0)}${wd.slice(1).toLowerCase()}, ${d} ${t.monthsLong[m - 1]}`;
}

/** «08 ноя, ПТ · 19:00» — строка прошедшей Записи. */
export function shortWhen(at: Date, t: CabinetDictionary): string {
  const { day, minutes } = zonedParts(at);
  const [, m, d] = day.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${t.months[m - 1]}, ${t.weekdays[weekdayOf(day) - 1]} · ${formatClock(minutes)}`;
}

/** «Вт, 11 ноября · 19:00–20:00» */
export function fullWhen(start: Date, end: Date, t: CabinetDictionary): string {
  return `${longDay(zonedParts(start).day, t)} · ${timeRange(start, end)}`;
}

/** «07:00 11 ноября» — до какого момента можно отменить. */
export function deadlineText(at: Date, t: CabinetDictionary): string {
  const { day, minutes } = zonedParts(at);
  const [, m, d] = day.split("-").map(Number);
  return `${formatClock(minutes)} ${d} ${t.monthsLong[m - 1]}`;
}
