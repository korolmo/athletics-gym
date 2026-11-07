import { text } from "@/lib/admin/form";
import { parseClock } from "@/lib/time";
import { checkWeek, isValidTimeOff, type TimeOff, type WorkInterval } from "../domain/schedule";

// Формы админки: часы работы Тренера и исключение. Админка только на русском — ошибки текстом.

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

const WEEK_ERRORS = {
  sessionMinutes: "Длительность тренировки — от 30 до 180 минут, шаг 15 минут.",
  interval: "Проверьте время: начало должно быть раньше конца, в формате 09:00.",
  tooShort: "В каждый интервал должна помещаться хотя бы одна тренировка.",
  overlap: "Интервалы одного дня не должны пересекаться.",
  tooMany: "Не больше 4 интервалов в день.",
} as const;

/**
 * Недельный шаблон из формы: `sessionMinutes` и пары полей `start-<день>-<n>` / `end-<день>-<n>` (день 1–7, n 0–3).
 * Пустая пара пропускается; заполнена наполовину — ошибка. Выключенный день (`off-<день>` = "on") игнорирует свои интервалы.
 */
export function parseWorkWeek(fd: FormData): Parsed<{ sessionMinutes: number; intervals: WorkInterval[] }> {
  const sessionMinutes = Number(text(fd, "sessionMinutes"));
  const intervals: WorkInterval[] = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    if (text(fd, `off-${weekday}`) === "on") continue;
    for (let n = 0; n < 8; n++) {
      const rawStart = text(fd, `start-${weekday}-${n}`);
      const rawEnd = text(fd, `end-${weekday}-${n}`);
      if (!rawStart && !rawEnd) continue;
      const startMin = parseClock(rawStart);
      const endMin = parseClock(rawEnd);
      if (startMin === null || endMin === null) return { ok: false, error: WEEK_ERRORS.interval };
      intervals.push({ weekday, startMin, endMin });
    }
  }
  const error = checkWeek(sessionMinutes, intervals);
  if (error) return { ok: false, error: WEEK_ERRORS[error] };
  return { ok: true, data: { sessionMinutes, intervals } };
}

/** Исключение: дни «с» и «по» (по — необязательно: один день), подпись до 60 символов. */
export function parseTimeOff(fd: FormData): Parsed<TimeOff & { note: string | null }> {
  const fromDay = text(fd, "fromDay");
  const toDay = text(fd, "toDay") || fromDay;
  const note = text(fd, "note").slice(0, 60) || null;
  if (!isValidTimeOff({ fromDay, toDay })) {
    return { ok: false, error: "Проверьте даты: «по» не раньше «с», исключение — не длиннее 90 дней." };
  }
  return { ok: true, data: { fromDay, toDay, note } };
}
