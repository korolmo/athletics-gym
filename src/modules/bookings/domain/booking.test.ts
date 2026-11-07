import { describe, expect, it } from "vitest";
import { CLIENT_CANCEL_DEADLINE_MS, bookingView, canClientCancel, clientCancelDeadline } from "./booking";
import { parseBookingForm } from "../validation/booking";

const now = new Date("2026-11-09T10:00:00Z");
const h = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

describe("правила Записи", () => {
  it("вид: будущая, прошедшая, отменённая", () => {
    expect(bookingView({ status: "ACTIVE", endAt: h(1) }, now)).toBe("upcoming");
    expect(bookingView({ status: "ACTIVE", endAt: h(0) }, now)).toBe("past");
    expect(bookingView({ status: "CANCELLED", endAt: h(5) }, now)).toBe("cancelled");
  });

  it("Клиент отменяет сам не позже чем за 12 часов", () => {
    expect(CLIENT_CANCEL_DEADLINE_MS).toBe(12 * 60 * 60 * 1000);
    expect(canClientCancel({ status: "ACTIVE", startAt: h(12) }, now)).toBe(true);
    expect(canClientCancel({ status: "ACTIVE", startAt: new Date(h(12).getTime() - 1) }, now)).toBe(false);
    expect(canClientCancel({ status: "CANCELLED", startAt: h(48) }, now)).toBe(false);
    expect(clientCancelDeadline(h(20))).toEqual(h(8));
  });
});

describe("форма «Записаться»", () => {
  const form = (f: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(f)) fd.set(k, v);
    return fd;
  };
  const ok = { trainerId: "ck1abc", startAt: "2026-11-11T14:00:00.000Z", idempotencyKey: "0b5a0e5c-2f3e-4d1a-9c55-0d6f2a1b3c4d" };

  it("правильная форма", () => {
    expect(parseBookingForm(form(ok))).toEqual({ ok: true, data: { ...ok, startAt: new Date(ok.startAt) } });
  });

  it.each([
    { ...ok, trainerId: "" },
    { ...ok, startAt: "2026-11-11 19:00" },
    { ...ok, startAt: "2026-11-11T14:00:00+05:00" },
    { ...ok, idempotencyKey: "123" },
  ])("испорченная форма — badRequest (%o)", (f) => expect(parseBookingForm(form(f))).toEqual({ ok: false, error: "badRequest" }));
});
