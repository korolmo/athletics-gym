import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/modules/owner";
import { lockClient, requireClient } from "@/modules/clients";
import { getBookableTrainer, getTrainerNames } from "@/modules/trainers";
import { enqueue } from "@/modules/notifications";
import { HALL_LABEL_RU, isHall } from "@/modules/tariffs/client";
import { BOOKING_HORIZON_DAYS, isWindowFree, sessionMinutesOf, type Busy } from "@/modules/schedule";
import {
  MAX_FUTURE_BOOKINGS,
  bookingView,
  canClientCancel,
  type BookingError,
  type BookingStatus,
  type BookingView,
  type CancelError,
} from "../domain/booking";
import type { BookingInput } from "../validation/booking";

// Записи к Тренеру (этап 1, ADR 0017). Гарантии — у базы:
// - двойная Запись на одно Окно: уникальный индекс (activeTrainerId, startAt) — второй вставке база отказывает (P2002);
// - повтор формы: уникальный ключ повтора — повтор возвращает уже созданную Запись;
// - лимит будущих Записей Клиента: строка Клиента блокируется (FOR UPDATE) до подсчёта, параллельные Записи
//   одного Клиента идут по очереди.
// Проверка «Окно свободно» в коде — только чтобы ответить сразу и понятно; гарантию даёт индекс.

type UniqueError = {
  code?: string;
  message?: string;
  meta?: { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: string; fields?: string[] } } } };
};

/**
 * Какой уникальный индекс нарушен (P2002): строка с именами полей или индекса. Prisma 6 клала поля в meta.target;
 * Prisma 7 через драйвер mariadb — только имя индекса («Booking_idempotencyKey_key») в
 * meta.driverAdapterError.cause.constraint и в тексте ошибки. Берём всё сразу — так верно в обеих.
 */
function uniqueTarget(e: unknown): string | null {
  if (typeof e !== "object" || e === null || (e as UniqueError).code !== "P2002") return null;
  const { meta, message } = e as UniqueError;
  const target = meta?.target;
  const constraint = meta?.driverAdapterError?.cause?.constraint;
  return [Array.isArray(target) ? target.join(",") : String(target ?? ""), constraint?.index ?? "", ...(constraint?.fields ?? []), message ?? ""].join(" ");
}

export type CreatedBooking = { id: string; trainerId: string | null; hallId: string; startAt: Date; endAt: Date };
export type CreateResult = { ok: true; booking: CreatedBooking; repeated: boolean } | { ok: false; error: BookingError };

const bookingFields = { id: true, trainerId: true, hallId: true, startAt: true, endAt: true } as const;

const hallName = (id: string) => (isHall(id) ? HALL_LABEL_RU[id] : id);

/** Сколько раз повторить транзакцию Записи, которую база откатила из-за взаимной блокировки. */
const DEADLOCK_RETRIES = 3;

/** Занятое время Тренера: действующие Записи, которые ещё не закончились, — для расчёта Окон. Без сессии. */
export async function trainerBusy(trainerId: string, now: Date = new Date()): Promise<Busy[]> {
  const until = new Date(now.getTime() + (BOOKING_HORIZON_DAYS + 1) * 24 * 60 * 60 * 1000);
  const rows = await db.booking.findMany({
    where: { trainerId, status: "ACTIVE", endAt: { gt: now }, startAt: { lt: until } },
    select: { startAt: true, endAt: true },
  });
  return rows.map((r) => ({ start: r.startAt, end: r.endAt }));
}

async function findByKey(clientId: string, idempotencyKey: string): Promise<CreatedBooking | null> {
  const row = await db.booking.findUnique({ where: { idempotencyKey }, select: { ...bookingFields, clientId: true } });
  if (!row || row.clientId !== clientId) return null;
  return { id: row.id, trainerId: row.trainerId, hallId: row.hallId, startAt: row.startAt, endAt: row.endAt };
}

/**
 * Создаёт Запись от имени Клиента `clientId` (сессию проверяет createBooking). Отдельно — для теста гонки на MariaDB.
 */
export async function createBookingFor(
  clientId: string,
  input: BookingInput,
  /** Пояс Клуба: по нему считаются Окна Тренера; передаёт слой приложения */
  timeZone: string,
  now: Date = new Date(),
  /** Для уведомления Владельцу: имя Клиента из сессии */
  clientName = "Клиент",
): Promise<CreateResult> {
  const { trainerId, startAt, idempotencyKey } = input;

  const repeated = await findByKey(clientId, idempotencyKey);
  if (repeated) return { ok: true, booking: repeated, repeated: true };

  const trainer = await getBookableTrainer(trainerId);
  if (!trainer) return { ok: false, error: "noTrainer" };
  if (!(await isWindowFree(trainerId, startAt, await trainerBusy(trainerId, now), timeZone, now))) return { ok: false, error: "taken" };
  const endAt = new Date(startAt.getTime() + (await sessionMinutesOf(trainerId)) * 60_000);

  const insert = () =>
    db.$transaction(
      async (tx) => {
        // Записи одного Клиента — по очереди: иначе две параллельные прошли бы подсчёт лимита вместе
        await lockClient(tx, clientId);
        const future = await tx.booking.count({ where: { clientId, status: "ACTIVE", endAt: { gt: now } } });
        if (future >= MAX_FUTURE_BOOKINGS) return null;
        const created = await tx.booking.create({
          data: { clientId, trainerId, hallId: trainer.hallId, startAt, endAt, activeTrainerId: trainerId, idempotencyKey },
          select: bookingFields,
        });
        // Уведомление Владельцу — в той же транзакции (transactional outbox): нет Записи — нет и события
        await enqueue(
          tx,
          { type: "booking.created", clientName, trainerName: trainer.name, hallName: hallName(trainer.hallId), startAt: startAt.toISOString(), endAt: endAt.toISOString() },
          now,
        );
        return created;
      },
      // Под наплывом транзакции ждут соединение из пула и блокировку строки Клиента дольше обычных 2 и 5 секунд
      { maxWait: 10_000, timeout: 10_000 },
    );

  try {
    let booking: Awaited<ReturnType<typeof insert>> | undefined;
    // Взаимная блокировка (P2034) — не ошибка Клиента: база откатила одну из транзакций, повторяем её
    for (let attempt = 1; booking === undefined; attempt++) {
      try {
        booking = await insert();
      } catch (e) {
        if ((e as { code?: string }).code !== "P2034" || attempt >= DEADLOCK_RETRIES) throw e;
      }
    }
    if (!booking) return { ok: false, error: "limit" };
    return { ok: true, booking, repeated: false };
  } catch (e) {
    const target = uniqueTarget(e);
    if (target === null) throw e;
    if (target.includes("idempotencyKey")) {
      const same = await findByKey(clientId, idempotencyKey);
      return same ? { ok: true, booking: same, repeated: true } : { ok: false, error: "badRequest" };
    }
    return { ok: false, error: "taken" };
  }
}

// ——— Кабинет ———

export async function createBooking(input: BookingInput, timeZone: string, now: Date = new Date()): Promise<CreateResult> {
  const client = await requireClient();
  return createBookingFor(client.id, input, timeZone, now, client.name);
}

export type ClientBooking = CreatedBooking & { status: BookingStatus; view: BookingView; canCancel: boolean };

/** Записи Клиента для «Мои Записи»: будущие (ближайшие первыми), затем последние прошедшие и отменённые. */
export async function listMyBookings(now: Date = new Date()): Promise<ClientBooking[]> {
  const client = await requireClient();
  const rows = await db.booking.findMany({
    where: { clientId: client.id },
    orderBy: { startAt: "desc" },
    take: 50,
    select: { ...bookingFields, status: true },
  });
  const views = rows.map((r) => ({ ...r, view: bookingView(r, now), canCancel: canClientCancel(r, now) }));
  return [...views.filter((r) => r.view === "upcoming").reverse(), ...views.filter((r) => r.view !== "upcoming")];
}

/** Отмена самим Клиентом: только своя действующая Запись и не позже срока. Повторная отмена — notFound. */
export async function cancelMyBooking(bookingId: string, now: Date = new Date()): Promise<{ ok: true } | { ok: false; error: CancelError }> {
  const client = await requireClient();
  const row = await db.booking.findFirst({
    where: { id: bookingId, clientId: client.id, status: "ACTIVE" },
    select: { startAt: true, endAt: true, status: true, trainerId: true, hallId: true },
  });
  if (!row) return { ok: false, error: "notFound" };
  if (!canClientCancel(row, now)) return { ok: false, error: "tooLate" };
  const trainerName = (row.trainerId && (await getTrainerNames([row.trainerId]))[row.trainerId]) || "Тренер";
  // Отмена и уведомление Владельцу — одной транзакцией: отменилось — значит, Владелец узнает
  const count = await db.$transaction(async (tx) => {
    const { count } = await tx.booking.updateMany({
      where: { id: bookingId, clientId: client.id, status: "ACTIVE" },
      data: { status: "CANCELLED", activeTrainerId: null, cancelledAt: now, cancelledBy: "client" },
    });
    if (count === 1) {
      await enqueue(
        tx,
        { type: "booking.cancelled", clientName: client.name, trainerName, hallName: hallName(row.hallId), startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() },
        now,
      );
    }
    return count;
  });
  return count === 1 ? { ok: true } : { ok: false, error: "notFound" };
}

// ——— Админка ———

export type AdminBooking = CreatedBooking & { clientId: string | null; status: BookingStatus; cancelledBy: string | null };

/** Записи за период (по началу) для раздела «Записи». Имена Клиентов и Тренеров добавляет слой приложения. */
export async function listBookingsForOwner(from: Date, to: Date, hallId?: string): Promise<AdminBooking[]> {
  await requireOwner();
  return db.booking.findMany({
    where: { startAt: { gte: from, lt: to }, ...(hallId ? { hallId } : {}) },
    orderBy: { startAt: "asc" },
    select: { ...bookingFields, clientId: true, status: true, cancelledBy: true },
  });
}

/** Отмена Владельцем — любой действующей Записи, в любое время. */
export async function cancelBookingByOwner(bookingId: string, now: Date = new Date()): Promise<boolean> {
  await requireOwner();
  const { count } = await db.booking.updateMany({
    where: { id: bookingId, status: "ACTIVE" },
    data: { status: "CANCELLED", activeTrainerId: null, cancelledAt: now, cancelledBy: "owner" },
  });
  return count === 1;
}

/** Перед удалением аккаунта: будущие действующие Записи Клиента отменяются — их Окна освобождаются. */
export async function cancelMyFutureBookings(now: Date = new Date()): Promise<number> {
  const client = await requireClient();
  const { count } = await db.booking.updateMany({
    where: { clientId: client.id, status: "ACTIVE", endAt: { gt: now } },
    data: { status: "CANCELLED", activeTrainerId: null, cancelledAt: now, cancelledBy: "client" },
  });
  return count;
}
