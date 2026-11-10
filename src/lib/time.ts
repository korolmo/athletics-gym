// Платформа: время Клуба (этап 1, ADR 0017). В базе время — в UTC; шаблон Окон и показ — в часовом поясе Клуба.
// Сущности Клуб в базе пока нет (П2): пояс — константа платформы, при П2 он станет полем Клуба и придёт аргументом.
// Чистые функции на Intl, без Node-модулей: работают на сервере, в браузере и в тестах.

/** Кызылорда: UTC+5 круглый год (с 1 марта 2024 — единый пояс Казахстана, без перехода на летнее время). */
export const CLUB_TIME_ZONE = "Asia/Qyzylorda";

/** День в виде «2026-11-11». */
export type Day = string;

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDay(value: string): value is Day {
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export type ZonedParts = {
  day: Day;
  /** 1 — понедельник … 7 — воскресенье */
  weekday: number;
  /** Минуты от полуночи местного дня */
  minutes: number;
};

/** Местный день, день недели и минуты от полуночи для момента `date` в поясе `timeZone`. */
export function zonedParts(date: Date, timeZone: string = CLUB_TIME_ZONE): ZonedParts {
  const p = Object.fromEntries(formatter(timeZone).formatToParts(date).map((x) => [x.type, x.value]));
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    weekday: WEEKDAYS[p.weekday],
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** Смещение пояса относительно UTC в минутах в момент `date` (Кызылорда — +300). */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = Object.fromEntries(formatter(timeZone).formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/** Момент UTC для местного дня и минут от полуночи. Два прохода — верно и для поясов с переводом часов. */
export function zonedToUtc(day: Day, minutes: number, timeZone: string = CLUB_TIME_ZONE): Date {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`Неверный день: ${day}`);
  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + minutes * 60_000;
  const first = naive - offsetMinutes(new Date(naive), timeZone) * 60_000;
  return new Date(naive - offsetMinutes(new Date(first), timeZone) * 60_000);
}

/** День через `n` дней (n может быть отрицательным). */
export function addDays(day: Day, n: number): Day {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`Неверный день: ${day}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n)).toISOString().slice(0, 10);
}

/** День недели местного дня: 1 — понедельник … 7 — воскресенье. */
export function weekdayOf(day: Day): number {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`Неверный день: ${day}`);
  const js = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return js === 0 ? 7 : js;
}

/** «09:30» → 570; мусор → null. 24:00 допустимо как конец дня. */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59 || h > 24 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/** 570 → «09:30». */
export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
