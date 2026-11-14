import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  ALERT_TYPES,
  BATCH,
  BOOKING_TYPES,
  LEASE_MS,
  MAX_ATTEMPTS,
  STATS_WINDOW_MS,
  alertText,
  backoffMs,
  messageText,
  parseAlert,
  parseEvent,
  summarizeDelivery,
} from "../domain/outbox";
import type { AlertEvent, AlertKind, BookingEvent, DeliveryStats, OutboxEventType } from "../domain/outbox";
import type { Sender } from "./telegram";
import { log } from "@/lib/observability/log";

// Transactional outbox (ADR 0017). Модуль ни от кого не зависит: событие ему передаёт модуль-хозяин в своей
// транзакции (enqueue), а проверку Владельца для админки — слой приложения аргументом, как хранилище Фото для health.

/** Записать событие в ту же транзакцию, что и изменение, которое его вызвало: нет изменения — нет и события. */
export async function enqueue(tx: Prisma.TransactionClient, event: BookingEvent, now: Date = new Date()): Promise<void> {
  const { type, ...payload } = event;
  await tx.outboxEvent.create({ data: { type, payload: JSON.stringify(payload), nextAttemptAt: now, createdAt: now } });
}

/** Итог прохода. `errors` — последние ошибки канала (без токена): по ним видно, почему не ушло, без доступа к базе. */
export type DeliveryReport = { sent: number; failed: number; dead: number; skipped: boolean; errors: string[] };

/**
 * Отправить ждущие события. Каждое сначала «занимается» (условный update по числу попыток): два отправщика
 * одновременно — cron и «сразу после ответа» — одно событие не отправят дважды. Без канала — ничего не трогаем.
 * Время в сообщении — в поясе Клуба `timeZone`: его передаёт слой приложения (модуль о Клубе не знает).
 */
export async function deliverPending(sender: Sender | null, timeZone: string, now: Date = new Date()): Promise<DeliveryReport> {
  return deliverDue(BOOKING_TYPES, sender, (type, payload, id) => {
    const e = parseEvent(type, payload);
    return e ? messageText(e, id, timeZone) : null;
  }, now);
}

/** Отправить ждущие тревоги мониторинга (этап 5, ADR 0028) — в чат «Дежурство», не Владельцу. */
export async function deliverAlerts(sender: Sender | null, now: Date = new Date()): Promise<DeliveryReport> {
  return deliverDue(ALERT_TYPES, sender, (type, payload, id) => {
    const e = parseAlert(type, payload);
    return e ? alertText(e, id) : null;
  }, now);
}

/** Общий проход отправщика по ждущим событиям своих типов: у Записей и тревог разные чаты. */
async function deliverDue(
  types: readonly string[],
  sender: Sender | null,
  render: (type: string, payload: string, id: string) => string | null,
  now: Date,
): Promise<DeliveryReport> {
  const report: DeliveryReport = { sent: 0, failed: 0, dead: 0, skipped: sender === null, errors: [] };
  if (!sender) return report;
  const due = await db.outboxEvent.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now }, type: { in: [...types] } },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, type: true, payload: true, attempts: true },
  });
  for (const ev of due) {
    const { count } = await db.outboxEvent.updateMany({
      where: { id: ev.id, status: "PENDING", attempts: ev.attempts, nextAttemptAt: { lte: now } },
      data: { nextAttemptAt: new Date(now.getTime() + LEASE_MS) },
    });
    if (count === 0) continue;

    const text = render(ev.type, ev.payload, ev.id);
    const parsed = text !== null;
    const result = parsed ? await sender.send(text) : { ok: false as const, error: "Событие не разобрать" };
    const attempts = ev.attempts + 1;
    if (result.ok) {
      await db.outboxEvent.update({ where: { id: ev.id }, data: { status: "SENT", attempts, sentAt: now, lastError: null } });
      report.sent++;
    } else {
      const dead = !parsed || attempts >= MAX_ATTEMPTS;
      await db.outboxEvent.update({
        where: { id: ev.id },
        data: { status: dead ? "DEAD" : "PENDING", attempts, lastError: result.error, nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)) },
      });
      if (!report.errors.includes(result.error) && report.errors.length < 3) report.errors.push(result.error);
      log("warn", `Очередь уведомлений: не отправлено (#${ev.id.slice(-6)}, попытка ${attempts})`, { error: result.error });
      if (dead) report.dead++;
      else report.failed++;
    }
  }
  return report;
}

// ——— Тревоги мониторинга (этап 5, ADR 0028) ———

export type BurnState = {
  /** Сработавшие тревоги выгорания (fastBurn, slowBurn) */
  firing: AlertKind[];
  /** Проверок нет или мало — «мониторинг слеп» */
  blind: boolean;
  burns: Partial<Record<AlertKind, number | null>>;
  thresholds: Partial<Record<AlertKind, number | null>>;
};

export type AlertRules = { repeatMs: number; blindRepeatMs: number; recoveryLookbackMs: number };

/** Последнее событие тревоги этого вида и типа после `since` — по типу и виду в данных события. */
function lastAlert(type: AlertEvent["type"], kind: AlertKind, since: Date) {
  return db.outboxEvent.findFirst({
    where: { type, createdAt: { gte: since }, payload: { contains: `"kind":"${kind}"` } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
}

function put(event: AlertEvent, now: Date) {
  const { type, ...payload } = event;
  return db.outboxEvent.create({ data: { type, payload: JSON.stringify(payload), nextAttemptAt: now, createdAt: now } });
}

/**
 * Поставить тревоги по состоянию выгорания. Повтор одного вида — не чаще `repeatMs` («слеп» — `blindRepeatMs`):
 * ключ — вид и время последней такой тревоги в очереди, поэтому экземпляры Vercel друг друга не дублируют.
 * Вид больше не горит, а тревога по нему была за `recoveryLookbackMs` и «восстановлено» после неё не было — ставим его.
 * Пока мониторинг слеп, «восстановлено» по выгоранию не шлём: тишина не значит «всё хорошо».
 */
export async function raiseAlerts(state: BurnState, rules: AlertRules, now: Date = new Date()): Promise<AlertEvent[]> {
  const raised: AlertEvent[] = [];
  const active: AlertKind[] = [...state.firing, ...(state.blind ? (["blind"] as const) : [])];
  for (const kind of active) {
    const repeat = kind === "blind" ? rules.blindRepeatMs : rules.repeatMs;
    if (await lastAlert("alert.raised", kind, new Date(now.getTime() - repeat))) continue;
    const event: AlertEvent = { type: "alert.raised", kind, burn: state.burns[kind] ?? null, threshold: state.thresholds[kind] ?? null };
    await put(event, now);
    raised.push(event);
  }
  for (const kind of (["fastBurn", "slowBurn", "blind"] as const).filter((k) => !active.includes(k))) {
    if (kind !== "blind" && state.blind) continue;
    const last = await lastAlert("alert.raised", kind, new Date(now.getTime() - rules.recoveryLookbackMs));
    if (!last) continue;
    if (await lastAlert("alert.recovered", kind, last.createdAt)) continue;
    const event: AlertEvent = { type: "alert.recovered", kind };
    await put(event, now);
    raised.push(event);
  }
  return raised;
}

// ——— Админка (проверку Владельца передаёт слой приложения) ———
// Владелец видит только события Записей: тревоги мониторинга — для разработчика, в чате «Дежурство».

export type ProblemEvent = {
  id: string;
  type: OutboxEventType;
  status: "PENDING" | "DEAD";
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  nextAttemptAt: Date;
  event: BookingEvent | null;
};

/** Недоставленные и ещё ждущие с ошибкой — для раздела «Уведомления». */
export async function listProblemEvents(ensureOwner: () => Promise<void>): Promise<ProblemEvent[]> {
  await ensureOwner();
  const rows = await db.outboxEvent.findMany({
    where: { type: { in: [...BOOKING_TYPES] }, OR: [{ status: "DEAD" }, { status: "PENDING", attempts: { gt: 0 } }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type as OutboxEventType,
    status: r.status as "PENDING" | "DEAD",
    attempts: r.attempts,
    lastError: r.lastError,
    createdAt: r.createdAt,
    nextAttemptAt: r.nextAttemptAt,
    event: parseEvent(r.type, r.payload),
  }));
}

/** Сколько недоставленных — для плашки «Не доставлено: N» в шапке админки. */
export async function countDead(ensureOwner: () => Promise<void>): Promise<number> {
  await ensureOwner();
  return db.outboxEvent.count({ where: { status: "DEAD", type: { in: [...BOOKING_TYPES] } } });
}

/** Сколько ждут отправки (в Лаборатории без бота они копятся). */
export async function countPending(ensureOwner: () => Promise<void>): Promise<number> {
  await ensureOwner();
  return db.outboxEvent.count({ where: { status: "PENDING", type: { in: [...BOOKING_TYPES] } } });
}

/** «Отправить ещё раз»: недоставленное снова в очередь, сразу, с новым счётом попыток. */
export async function retryEvent(id: string, ensureOwner: () => Promise<void>, now: Date = new Date()): Promise<void> {
  await ensureOwner();
  await db.outboxEvent.updateMany({ where: { id, status: { in: ["DEAD", "PENDING"] } }, data: { status: "PENDING", attempts: 0, nextAttemptAt: now } });
}

/** «Пометить решённым»: Владелец узнал о Записи сам — событие больше не отправляется и не висит в списке. */
export async function resolveEvent(id: string, ensureOwner: () => Promise<void>): Promise<void> {
  await ensureOwner();
  await db.outboxEvent.updateMany({ where: { id, status: { in: ["DEAD", "PENDING"] } }, data: { status: "RESOLVED" } });
}

/** Сводка доставки за неделю — для раздела «Уведомления» и итогов этапа (доля вовремя, недоставленные). */
export async function deliveryStats(ensureOwner: () => Promise<void>, now: Date = new Date()): Promise<DeliveryStats> {
  await ensureOwner();
  const rows = await db.outboxEvent.findMany({
    where: { type: { in: [...BOOKING_TYPES] }, createdAt: { gte: new Date(now.getTime() - STATS_WINDOW_MS) } },
    select: { status: true, createdAt: true, sentAt: true },
  });
  return summarizeDelivery(rows, now);
}
