import { describe, expect, it } from "vitest";
import { ON_TIME_MS, summarizeDelivery } from "./outbox";

// Сводка доставки за неделю (решение 20 этапа 1): доля «вовремя» — не позже 5 минут от события.

const now = new Date("2026-11-10T12:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60_000);
const sent = (createdMin: number, lagMin: number) => ({ status: "SENT", createdAt: ago(createdMin), sentAt: new Date(ago(createdMin).getTime() + lagMin * 60_000) });

describe("сводка доставки", () => {
  it("без событий доли нет", () => {
    expect(summarizeDelivery([], now)).toMatchObject({ total: 0, onTimeShare: null, slowestMs: null });
  });

  it("вовремя — не позже 5 минут; недоставленное и опоздавшее — не вовремя", () => {
    const s = summarizeDelivery([sent(100, 0), sent(90, 5), sent(80, 12), { status: "DEAD", createdAt: ago(500), sentAt: null }], now);
    expect(s).toMatchObject({ total: 4, sent: 3, onTime: 2, dead: 1, onTimeShare: 0.5, slowestMs: 12 * 60_000 });
  });

  it("ждущее моложе 5 минут в долю не входит, старше — входит как не вовремя", () => {
    const fresh = { status: "PENDING", createdAt: new Date(now.getTime() - ON_TIME_MS + 1000), sentAt: null };
    const stale = { status: "PENDING", createdAt: ago(30), sentAt: null };
    expect(summarizeDelivery([sent(10, 1), fresh], now)).toMatchObject({ pending: 1, onTimeShare: 1 });
    expect(summarizeDelivery([sent(10, 1), stale], now)).toMatchObject({ pending: 1, onTimeShare: 0.5 });
  });

  it("решённое Владельцем вручную — не вовремя", () => {
    expect(summarizeDelivery([sent(10, 1), { status: "RESOLVED", createdAt: ago(60), sentAt: null }], now)).toMatchObject({ resolved: 1, onTimeShare: 0.5 });
  });
});
