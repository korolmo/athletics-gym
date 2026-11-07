import { text } from "@/lib/admin/form";
import { IDEMPOTENCY_KEY_RE } from "../domain/booking";

// Форма «Записаться»: Тренер, начало Окна (ISO UTC, как его отдал сервер) и ключ повтора.

export type BookingInput = { trainerId: string; startAt: Date; idempotencyKey: string };

export function parseBookingForm(fd: FormData): { ok: true; data: BookingInput } | { ok: false; error: "badRequest" } {
  const trainerId = text(fd, "trainerId");
  const rawStart = text(fd, "startAt");
  const idempotencyKey = text(fd, "idempotencyKey").toLowerCase();
  const startAt = new Date(rawStart);
  if (
    !/^[a-z0-9]{1,40}$/i.test(trainerId) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(rawStart) ||
    Number.isNaN(startAt.getTime()) ||
    !IDEMPOTENCY_KEY_RE.test(idempotencyKey)
  ) {
    return { ok: false, error: "badRequest" };
  }
  return { ok: true, data: { trainerId, startAt, idempotencyKey } };
}
