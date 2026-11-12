import { beforeEach, describe, expect, it, vi } from "vitest";

// Попутная отправка: без канала — ничего, не чаще раза в минуту, после Записи — сразу.

const { after, sender } = vi.hoisted(() => ({ after: vi.fn(), sender: { current: null as object | null } }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after }));
vi.mock("@/modules/club", () => ({ getClub: async () => ({ timeZone: "Asia/Qyzylorda" }) }));
vi.mock("@/modules/notifications", () => ({ resolveSender: () => sender.current, deliverPending: vi.fn(async () => ({})) }));

const { kickOutbox, KICK_GAP_MS } = await import("./outbox-kick");

beforeEach(() => after.mockReset());

describe("kickOutbox", () => {
  it("без бота отправщик не запускается", () => {
    sender.current = null;
    expect(kickOutbox({ now: 1_000_000 })).toBe(false);
    expect(after).not.toHaveBeenCalled();
  });

  it("не чаще раза в минуту; force — всегда", () => {
    sender.current = { name: "test" };
    const t = 10_000_000;
    expect(kickOutbox({ now: t })).toBe(true);
    expect(kickOutbox({ now: t + KICK_GAP_MS - 1 })).toBe(false);
    expect(kickOutbox({ now: t + 1, force: true })).toBe(true);
    expect(kickOutbox({ now: t + 1 + KICK_GAP_MS })).toBe(true);
    expect(after).toHaveBeenCalledTimes(3);
  });
});
