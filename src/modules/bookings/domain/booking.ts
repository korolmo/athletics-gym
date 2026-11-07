// Запись (GLOSSARY, ADR 0017): правила без базы — лимит будущих Записей, срок отмены, вид Записи в кабинете.

/** У Клиента не больше 3 будущих действующих Записей. Число названо в кабинете и Политике. */
export const MAX_FUTURE_BOOKINGS = 3;

/** Сам Клиент отменяет Запись не позже чем за 12 часов до начала; позже — только через зал. */
export const CLIENT_CANCEL_DEADLINE_MS = 12 * 60 * 60 * 1000;

/** Ключ повтора из формы: UUID, его создаёт браузер при открытии формы. */
export const IDEMPOTENCY_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BookingStatus = "ACTIVE" | "CANCELLED";

export type BookingView = "upcoming" | "past" | "cancelled";

/** Будущая — действующая и ещё не закончилась; прошедшая — действующая и закончилась. */
export function bookingView(b: { status: BookingStatus; endAt: Date }, now: Date): BookingView {
  if (b.status === "CANCELLED") return "cancelled";
  return b.endAt.getTime() > now.getTime() ? "upcoming" : "past";
}

/** Может ли Клиент сам отменить Запись сейчас. */
export function canClientCancel(b: { status: BookingStatus; startAt: Date }, now: Date): boolean {
  return b.status === "ACTIVE" && b.startAt.getTime() - now.getTime() >= CLIENT_CANCEL_DEADLINE_MS;
}

/** До какого момента Клиент может отменить сам — для подсказки «Отменить можно до 07:00 11 ноября». */
export function clientCancelDeadline(startAt: Date): Date {
  return new Date(startAt.getTime() - CLIENT_CANCEL_DEADLINE_MS);
}

/** Почему Запись не создана — кодами: кабинет двуязычный. */
export type BookingError = "taken" | "limit" | "noTrainer" | "badRequest";

/** Почему Клиент не может отменить. */
export type CancelError = "notFound" | "tooLate";
