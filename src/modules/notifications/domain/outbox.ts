// Очередь уведомлений Владельца (этап 1, ADR 0017): события и правила повторов — без базы и сети.
import { formatClock, weekdayOf, zonedParts } from "@/lib/time";

/** Не больше 8 попыток: после этого событие недоставлено (DEAD) и видно в админке. */
export const MAX_ATTEMPTS = 8;

/** Пауза перед следующей попыткой растёт вдвое: 1, 2, 4 … минут, но не больше часа. */
export function backoffMs(attempts: number): number {
  return Math.min(60, 2 ** Math.max(0, attempts - 1)) * 60_000;
}

/** Пока событие отправляется, оно занято на 2 минуты: второй отправщик (cron и «сразу после ответа») его не возьмёт. */
export const LEASE_MS = 2 * 60_000;

/** За один проход отправщик берёт не больше 20 событий: проход укладывается в время ответа маршрута. */
export const BATCH = 20;

export type BookingEvent = {
  type: "booking.created" | "booking.cancelled";
  clientName: string;
  trainerName: string;
  hallName: string;
  /** ISO, UTC */
  startAt: string;
  endAt: string;
};

export type OutboxEventType = BookingEvent["type"];

const WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «вт, 11 ноября, 19:00–20:00» — в поясе Клуба. */
export function whenLabel(startIso: string, endIso: string, timeZone: string): string {
  const s = zonedParts(new Date(startIso), timeZone);
  const e = zonedParts(new Date(endIso), timeZone);
  const [, m, d] = s.day.split("-").map(Number);
  return `${WD[weekdayOf(s.day) - 1]}, ${d} ${MONTHS[m - 1]}, ${formatClock(s.minutes)}–${formatClock(e.minutes)}`;
}

/** Текст сообщения Владельцу. Номер события в конце — по нему повтор узнаётся как то же событие. */
export function messageText(e: BookingEvent, eventId: string, timeZone: string): string {
  const head = e.type === "booking.created" ? "🟢 Новая запись" : "🔴 Запись отменена клиентом";
  return [head, `${e.clientName} → ${e.trainerName} (${e.hallName})`, whenLabel(e.startAt, e.endAt, timeZone), `#${eventId.slice(-6)}`].join("\n");
}

/** Разбор сохранённого события: испорченный JSON — null (событие уйдёт в недоставленные с понятной ошибкой). */
export function parseEvent(type: string, payload: string): BookingEvent | null {
  if (type !== "booking.created" && type !== "booking.cancelled") return null;
  try {
    const p = JSON.parse(payload) as Partial<BookingEvent>;
    if (typeof p.clientName !== "string" || typeof p.trainerName !== "string" || typeof p.startAt !== "string" || typeof p.endAt !== "string") return null;
    return { type, clientName: p.clientName, trainerName: p.trainerName, hallName: p.hallName ?? "", startAt: p.startAt, endAt: p.endAt };
  } catch {
    return null;
  }
}

export const EVENT_LABEL_RU: Record<OutboxEventType, string> = {
  "booking.created": "Новая запись",
  "booking.cancelled": "Отмена записи",
};

// ——— Сводка доставки (решение 20 этапа 1: доля доставленных за 5 минут и недоставленные за неделю) ———

/** Окно сводки — неделя, как неделя этапа в Лаборатории. */
export const STATS_WINDOW_MS = 7 * 24 * 60 * 60_000;
/** «Вовремя» — не позже 5 минут от события до отправки. */
export const ON_TIME_MS = 5 * 60_000;

export type DeliveryRow = { status: string; createdAt: Date; sentAt: Date | null };
export type DeliveryStats = {
  total: number;
  sent: number;
  /** Отправлено не позже ON_TIME_MS после события. */
  onTime: number;
  pending: number;
  dead: number;
  resolved: number;
  /** Доля вовремя среди событий окна, кроме ждущих моложе ON_TIME_MS: у них срок ещё не вышел. Нет событий — null. */
  onTimeShare: number | null;
  /** Самая долгая доставка за окно, мс. */
  slowestMs: number | null;
};

export function summarizeDelivery(rows: DeliveryRow[], now: Date): DeliveryStats {
  const s: DeliveryStats = { total: rows.length, sent: 0, onTime: 0, pending: 0, dead: 0, resolved: 0, onTimeShare: null, slowestMs: null };
  let counted = 0;
  for (const r of rows) {
    if (r.status === "SENT") s.sent++;
    else if (r.status === "DEAD") s.dead++;
    else if (r.status === "RESOLVED") s.resolved++;
    else s.pending++;
    if (r.status === "PENDING" && now.getTime() - r.createdAt.getTime() < ON_TIME_MS) continue;
    counted++;
    if (r.status === "SENT" && r.sentAt) {
      const lag = r.sentAt.getTime() - r.createdAt.getTime();
      if (lag <= ON_TIME_MS) s.onTime++;
      s.slowestMs = Math.max(s.slowestMs ?? 0, lag);
    }
  }
  s.onTimeShare = counted > 0 ? s.onTime / counted : null;
  return s;
}
