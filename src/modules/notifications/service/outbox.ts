import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BATCH, LEASE_MS, MAX_ATTEMPTS, backoffMs, messageText, parseEvent, type BookingEvent, type OutboxEventType } from "../domain/outbox";
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
 */
export async function deliverPending(sender: Sender | null, now: Date = new Date()): Promise<DeliveryReport> {
  const report: DeliveryReport = { sent: 0, failed: 0, dead: 0, skipped: sender === null, errors: [] };
  if (!sender) return report;
  const due = await db.outboxEvent.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
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

    const parsed = parseEvent(ev.type, ev.payload);
    const result = parsed ? await sender.send(messageText(parsed, ev.id)) : { ok: false as const, error: "Событие не разобрать" };
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

// ——— Админка (проверку Владельца передаёт слой приложения) ———

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
    where: { OR: [{ status: "DEAD" }, { status: "PENDING", attempts: { gt: 0 } }] },
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
  return db.outboxEvent.count({ where: { status: "DEAD" } });
}

/** Сколько ждут отправки (в Лаборатории без бота они копятся). */
export async function countPending(ensureOwner: () => Promise<void>): Promise<number> {
  await ensureOwner();
  return db.outboxEvent.count({ where: { status: "PENDING" } });
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
