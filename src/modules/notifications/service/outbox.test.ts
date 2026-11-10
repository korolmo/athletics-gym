import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_ATTEMPTS, backoffMs, messageText, parseEvent, whenLabel, type BookingEvent } from "../domain/outbox";
import { resolveSender, telegramSender, type Sender } from "./telegram";

// Очередь уведомлений без базы: таблица OutboxEvent — в памяти.

type Row = { id: string; type: string; payload: string; status: string; attempts: number; nextAttemptAt: Date; lastError: string | null; createdAt: Date; sentAt: Date | null };

const { state, db } = vi.hoisted(() => {
  const state = { rows: [] as Row[] };
  const db = {
    outboxEvent: {
      findMany: vi.fn(async ({ where, take }: { where: { status: string; nextAttemptAt: { lte: Date } }; take: number }) =>
        state.rows
          .filter((r) => r.status === where.status && r.nextAttemptAt <= where.nextAttemptAt.lte)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .slice(0, take)
          .map((r) => ({ ...r })),
      ),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status: string; attempts: number; nextAttemptAt: { lte: Date } }; data: Partial<Row> }) => {
        const hit = state.rows.filter((r) => r.id === where.id && r.status === where.status && r.attempts === where.attempts && r.nextAttemptAt <= where.nextAttemptAt.lte);
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        Object.assign(state.rows.find((r) => r.id === where.id)!, data);
      }),
    },
  };
  return { state, db };
});

vi.mock("@/lib/db", () => ({ db }));

const { deliverPending, enqueue } = await import("./outbox");

const now = new Date("2026-11-10T10:00:00Z");
const event: BookingEvent = {
  type: "booking.created",
  clientName: "Дана",
  trainerName: "Арман",
  hallName: "Общий зал",
  startAt: "2026-11-11T14:00:00.000Z",
  endAt: "2026-11-11T15:00:00.000Z",
};
const row = (id: string, over: Partial<Row> = {}): Row => {
  const { type, ...payload } = event;
  return { id, type, payload: JSON.stringify(payload), status: "PENDING", attempts: 0, nextAttemptAt: now, lastError: null, createdAt: now, sentAt: null, ...over };
};
const okSender = (): Sender & { sent: string[] } => {
  const sent: string[] = [];
  return { name: "test", sent, send: async (text) => (sent.push(text), { ok: true }) };
};
const failSender: Sender = { name: "fail", send: async () => ({ ok: false, error: "Telegram 502" }) };

beforeEach(() => {
  state.rows = [];
});

describe("правила очереди", () => {
  it("пауза растёт вдвое и не больше часа; попыток — 8", () => {
    expect([1, 2, 3, 4, 7, 8].map((a) => backoffMs(a) / 60_000)).toEqual([1, 2, 4, 8, 60, 60]);
    expect(MAX_ATTEMPTS).toBe(8);
  });

  it("сообщение — в поясе Клуба, с номером события", () => {
    expect(whenLabel(event.startAt, event.endAt)).toBe("ср, 11 ноября, 19:00–20:00");
    expect(messageText(event, "ckabc123xyz")).toBe("🟢 Новая запись\nДана → Арман (Общий зал)\nср, 11 ноября, 19:00–20:00\n#123xyz");
  });

  it("испорченное событие не разбирается", () => {
    expect(parseEvent("booking.created", "{")).toBeNull();
    expect(parseEvent("other", "{}")).toBeNull();
  });
});

describe("отправщик", () => {
  it("без канала (нет токена бота) ничего не трогает", async () => {
    state.rows = [row("e1")];
    expect(await deliverPending(null, now)).toEqual({ sent: 0, failed: 0, dead: 0, skipped: true, errors: [] });
    expect(state.rows[0]).toMatchObject({ status: "PENDING", attempts: 0 });
  });

  it("отправленное — SENT, ждущее в будущем — не берётся", async () => {
    state.rows = [row("e1"), row("e2", { nextAttemptAt: new Date(now.getTime() + 60_000) })];
    const s = okSender();
    expect(await deliverPending(s, now)).toMatchObject({ sent: 1 });
    expect(state.rows.map((r) => r.status)).toEqual(["SENT", "PENDING"]);
    expect(s.sent[0]).toContain("Дана → Арман");
  });

  it("сбой — повтор позже с растущей паузой; после 8 попыток — недоставлено", async () => {
    state.rows = [row("e1")];
    let t = now;
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      expect(await deliverPending(failSender, t)).toMatchObject({ failed: 1, errors: ["Telegram 502"] });
      expect(state.rows[0]).toMatchObject({ status: "PENDING", attempts: i, lastError: "Telegram 502" });
      expect(state.rows[0].nextAttemptAt.getTime() - t.getTime()).toBe(backoffMs(i));
      t = state.rows[0].nextAttemptAt;
    }
    expect(await deliverPending(failSender, t)).toMatchObject({ dead: 1 });
    expect(state.rows[0]).toMatchObject({ status: "DEAD", attempts: MAX_ATTEMPTS });
  });

  it("два отправщика одновременно не шлют одно событие дважды", async () => {
    state.rows = [row("e1")];
    const s = okSender();
    await Promise.all([deliverPending(s, now), deliverPending(s, now)]);
    expect(s.sent).toHaveLength(1);
  });

  it("испорченное событие сразу недоставлено, с понятной ошибкой", async () => {
    state.rows = [row("e1", { payload: "{" })];
    expect(await deliverPending(okSender(), now)).toMatchObject({ dead: 1 });
    expect(state.rows[0].lastError).toBe("Событие не разобрать");
  });

  it("enqueue пишет событие через транзакцию вызывающего", async () => {
    const tx = { outboxEvent: { create: vi.fn(async () => ({})) } };
    await enqueue(tx as never, event, now);
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({
      data: { type: "booking.created", payload: expect.stringContaining('"clientName":"Дана"'), nextAttemptAt: now, createdAt: now },
    });
  });
});

describe("Telegram", () => {
  it("канал есть только с токеном и чатом", () => {
    expect(resolveSender({})).toBeNull();
    expect(resolveSender({ TELEGRAM_BOT_TOKEN: "t" })).toBeNull();
    expect(resolveSender({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1" })?.name).toBe("telegram");
  });

  it("ошибка Telegram — текстом без токена; сбой сети — тоже ошибка, не исключение", async () => {
    const bad = telegramSender("SECRET", "1", (async () => new Response("Forbidden: bot was blocked", { status: 403 })) as typeof fetch);
    const r = await bad.send("x");
    expect(r).toEqual({ ok: false, error: "Telegram 403 (чат …1): Forbidden: bot was blocked" });
    expect(await telegramSender("123:abc", "123").send("x")).toEqual({ ok: false, error: "TELEGRAM_CHAT_ID — это id самого бота (…23), нужен id чата Владельца" });
    expect(JSON.stringify(r)).not.toContain("SECRET");
    const down = telegramSender("SECRET", "1", (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch);
    expect(await down.send("x")).toEqual({ ok: false, error: "Telegram недоступен: TypeError" });
    const ok = telegramSender("T", "42", (async (_url: string, init: RequestInit) => {
      expect(JSON.parse(String(init.body))).toMatchObject({ chat_id: "42", text: "привет" });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch);
    expect(await ok.send("привет")).toEqual({ ok: true });
  });
});
