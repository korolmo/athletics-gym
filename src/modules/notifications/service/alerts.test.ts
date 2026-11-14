import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Sender } from "./telegram";

// Тревоги мониторинга через outbox (этап 5, ADR 0028): защита от повторов, «восстановлено», отдельный чат.

type Row = { id: string; type: string; payload: string; status: string; attempts: number; nextAttemptAt: Date; lastError: string | null; createdAt: Date; sentAt: Date | null };

const { state, db } = vi.hoisted(() => {
  const state = { rows: [] as Row[], seq: 0 };
  type Where = { type?: string | { in: string[] }; createdAt?: { gte: Date }; payload?: { contains: string }; status?: string; nextAttemptAt?: { lte: Date } };
  const match = (r: Row, w: Where) =>
    (w.type === undefined || (typeof w.type === "string" ? r.type === w.type : w.type.in.includes(r.type))) &&
    (w.createdAt === undefined || r.createdAt >= w.createdAt.gte) &&
    (w.payload === undefined || r.payload.includes(w.payload.contains)) &&
    (w.status === undefined || r.status === w.status) &&
    (w.nextAttemptAt === undefined || r.nextAttemptAt <= w.nextAttemptAt.lte);
  const db = {
    outboxEvent: {
      findFirst: vi.fn(async ({ where }: { where: Where }) => {
        const hits = state.rows.filter((r) => match(r, where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return hits[0] ? { createdAt: hits[0].createdAt } : null;
      }),
      findMany: vi.fn(async ({ where, take }: { where: Where; take: number }) => state.rows.filter((r) => match(r, where)).slice(0, take).map((r) => ({ ...r }))),
      create: vi.fn(async ({ data }: { data: { type: string; payload: string; nextAttemptAt: Date; createdAt: Date } }) => {
        state.rows.push({ id: `ev${++state.seq}`, status: "PENDING", attempts: 0, lastError: null, sentAt: null, ...data });
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status: string; attempts: number }; data: Partial<Row> }) => {
        const hit = state.rows.filter((r) => r.id === where.id && r.status === where.status && r.attempts === where.attempts);
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => void Object.assign(state.rows.find((r) => r.id === where.id)!, data)),
    },
  };
  return { state, db };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/observability/log", () => ({ log: vi.fn() }));

const { deliverAlerts, deliverPending, raiseAlerts } = await import("./outbox");
const { alertText, parseAlert } = await import("../domain/outbox");

const HOUR = 3_600_000;
const RULES = { repeatMs: HOUR, blindRepeatMs: 6 * HOUR, recoveryLookbackMs: 7 * HOUR };
const t0 = new Date("2026-11-20T12:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const fast = { firing: ["fastBurn" as const], blind: false, burns: { fastBurn: 18 }, thresholds: { fastBurn: 14.4 } };
const calm = { firing: [], blind: false, burns: {}, thresholds: {} };
const okSender = (): Sender & { sent: string[] } => {
  const sent: string[] = [];
  return { name: "test", sent, send: async (text) => (sent.push(text), { ok: true }) };
};

beforeEach(() => {
  state.rows = [];
  state.seq = 0;
});

describe("тревоги мониторинга", () => {
  it("быстрое выгорание — одна тревога в час, даже если экземпляров несколько", async () => {
    expect(await raiseAlerts(fast, RULES, t0)).toHaveLength(1);
    expect(await raiseAlerts(fast, RULES, at(15))).toHaveLength(0);
    expect(await raiseAlerts(fast, RULES, at(45))).toHaveLength(0);
    expect(await raiseAlerts(fast, RULES, at(61))).toHaveLength(1);
  });

  it("выгорание кончилось — «восстановлено» один раз", async () => {
    await raiseAlerts(fast, RULES, t0);
    expect(await raiseAlerts(calm, RULES, at(30))).toEqual([{ type: "alert.recovered", kind: "fastBurn" }]);
    expect(await raiseAlerts(calm, RULES, at(45))).toEqual([]);
  });

  it("без тревоги «восстановлено» не шлём; старая тревога (больше 7 ч назад) — тоже", async () => {
    expect(await raiseAlerts(calm, RULES, t0)).toEqual([]);
    await raiseAlerts(fast, RULES, t0);
    expect(await raiseAlerts(calm, RULES, at(8 * 60))).toEqual([]);
  });

  it("мониторинг слеп — тревога раз в 6 часов, и «восстановлено» по выгоранию не шлём, пока слепы", async () => {
    await raiseAlerts(fast, RULES, t0);
    const blind = { firing: [], blind: true, burns: {}, thresholds: {} };
    expect(await raiseAlerts(blind, RULES, at(15))).toEqual([{ type: "alert.raised", kind: "blind", burn: null, threshold: null }]);
    expect(await raiseAlerts(blind, RULES, at(5 * 60))).toEqual([]);
    expect((await raiseAlerts(calm, RULES, at(5 * 60 + 15))).map((e) => e.kind).sort()).toEqual(["blind", "fastBurn"]);
  });

  it("тревоги уходят только отправителем тревог, Записи — только отправителем Владельца", async () => {
    await raiseAlerts(fast, RULES, t0);
    const owner = okSender();
    expect(await deliverPending(owner, "Asia/Qyzylorda", at(1))).toMatchObject({ sent: 0 });
    expect(owner.sent).toEqual([]);
    const duty = okSender();
    expect(await deliverAlerts(duty, at(1))).toMatchObject({ sent: 1 });
    expect(duty.sent[0]).toContain("🔥 Лаборатория: быстрое выгорание");
    expect(duty.sent[0]).toContain("burn rate 18,0 (порог 14,4)");
  });

  it("без чата «Дежурство» тревоги ждут в очереди", async () => {
    await raiseAlerts(fast, RULES, t0);
    expect(await deliverAlerts(null, at(1))).toMatchObject({ skipped: true });
    expect(state.rows[0].status).toBe("PENDING");
  });

  it("разбор и текст: испорченное — null, «слеп» и «восстановлено» — свои тексты", () => {
    expect(parseAlert("alert.raised", "{bad")).toBeNull();
    expect(parseAlert("alert.raised", JSON.stringify({ kind: "nope" }))).toBeNull();
    expect(parseAlert("booking.created", "{}")).toBeNull();
    expect(alertText({ type: "alert.raised", kind: "blind", burn: null, threshold: null }, "abcdef123456")).toContain("мониторинг слеп");
    expect(alertText({ type: "alert.recovered", kind: "slowBurn" }, "abcdef123456")).toBe("✅ Лаборатория: медленное выгорание бюджета ошибок (окно 6 ч) — восстановлено\n#123456");
  });
});
