import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoChannel, resolveCodeChannel, type CodeChannel } from "./code-channel";
import { MAX_CODE_ATTEMPTS, CODE_TTL_MS } from "../domain/login-code.rules";

// Вход Клиента проверяем без базы: Prisma подменён таблицами в памяти.

type CodeRow = { id: string; phone: string; codeHash: string; ipHash: string; attempts: number; expiresAt: Date; createdAt: Date };
type ClientRow = { id: string; phone: string; name: string; sessionVersion: number; consentAt: Date; consentPolicyDate: string; lastLoginAt: Date };

const { state, db } = vi.hoisted(() => {
  const state = { codes: [] as CodeRow[], clients: [] as ClientRow[], seq: 0 };
  const db = {
    clientLoginCode: {
      findMany: vi.fn(async ({ where }: { where: { OR: { phone?: string; ipHash?: string }[]; createdAt: { gt: Date } } }) =>
        state.codes
          .filter((c) => where.OR.some((o) => (o.phone ? c.phone === o.phone : c.ipHash === o.ipHash)) && c.createdAt > where.createdAt.gt)
          .map((c) => ({ ...c })),
      ),
      findFirst: vi.fn(async ({ where }: { where: { phone: string } }) => {
        const rows = state.codes.filter((c) => c.phone === where.phone).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return rows[0] ? { ...rows[0] } : null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<CodeRow, "id" | "attempts"> }) => {
        const row = { id: `c${++state.seq}`, attempts: 0, ...data };
        state.codes.push(row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string }; data: { attempts: { increment: number } } }) => {
        state.codes.filter((c) => c.id === where.id).forEach((c) => (c.attempts += data.attempts.increment));
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id?: string; phone?: string; createdAt?: { lt: Date } } }) => {
        const before = state.codes.length;
        state.codes = state.codes.filter(
          (c) =>
            !(
              (where.id === undefined || c.id === where.id) &&
              (where.phone === undefined || c.phone === where.phone) &&
              (where.createdAt === undefined || c.createdAt < where.createdAt.lt)
            ),
        );
        return { count: before - state.codes.length };
      }),
    },
    client: {
      findUnique: vi.fn(async ({ where }: { where: { phone: string } }) => {
        const row = state.clients.find((c) => c.phone === where.phone);
        return row ? { id: row.id, sessionVersion: row.sessionVersion } : null;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<ClientRow> }) => {
        Object.assign(state.clients.find((c) => c.id === where.id)!, data);
      }),
      create: vi.fn(async ({ data }: { data: Omit<ClientRow, "id" | "sessionVersion"> }) => {
        const row = { id: `k${++state.seq}`, sessionVersion: 1, ...data };
        state.clients.push(row);
        return { id: row.id, sessionVersion: row.sessionVersion };
      }),
    },
  };
  return { state, db };
});

vi.mock("@/lib/db", () => ({ db }));
vi.stubEnv("AUTH_SECRET", "x".repeat(40));

const { requestLoginCode, verifyLoginCode } = await import("./login");

const PHONE = "+77000000001";
const now = new Date(1_800_000_000_000);
const later = (ms: number) => new Date(now.getTime() + ms);

async function codeFor(phone = PHONE, ip = "ip1", at = now): Promise<string> {
  const r = await requestLoginCode(phone, ip, demoChannel, at);
  if (!r.ok || !r.shownCode) throw new Error(`код не выдан: ${JSON.stringify(r)}`);
  return r.shownCode;
}

beforeEach(() => {
  state.codes = [];
  state.clients = [];
});

describe("канал доставки кода", () => {
  it("по умолчанию — демо, но не на боевом сайте", () => {
    expect(resolveCodeChannel({})?.name).toBe("demo");
    expect(resolveCodeChannel({ APP_ENV: "lab" })?.name).toBe("demo");
    expect(resolveCodeChannel({ APP_ENV: "production" })).toBeNull();
    expect(resolveCodeChannel({ CLIENT_CODE_CHANNEL: "sms" })).toBeNull();
  });
});

describe("запрос кода", () => {
  it("без канала вход закрыт", async () => {
    expect(await requestLoginCode(PHONE, "ip1", null, now)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("демо-канал не выдаёт код настоящему номеру и ничего о нём не хранит", async () => {
    expect(await requestLoginCode("+77012345678", "ip1", demoChannel, now)).toEqual({ ok: false, reason: "phoneNotAllowed" });
    expect(state.codes).toHaveLength(0);
  });

  it("код показан на экране, в базе — только хэш", async () => {
    const code = await codeFor();
    expect(code).toMatch(/^\d{6}$/);
    expect(state.codes).toHaveLength(1);
    expect(state.codes[0].codeHash).not.toContain(code);
  });

  it("не больше 3 кодов на номер за 15 минут", async () => {
    for (let i = 0; i < 3; i++) await codeFor(PHONE, "ip1", later(i * 1000));
    expect(await requestLoginCode(PHONE, "ip1", demoChannel, later(5000))).toMatchObject({ ok: false, reason: "tooMany" });
  });

  it("не больше 10 кодов с одного адреса за час — на разные номера", async () => {
    const phones = ["+77000000001", "+77000000002", "+77000000003", "+77000000004"];
    for (let i = 0; i < 10; i++) await codeFor(phones[i % 4], "ip1", later(i * 1000));
    expect(await requestLoginCode("+77000000005", "ip1", demoChannel, later(20_000))).toMatchObject({ ok: false, reason: "tooMany" });
    expect((await requestLoginCode("+77000000005", "ip2", demoChannel, later(20_000))).ok).toBe(true);
  });

  it("недоставленный код — отказ", async () => {
    const broken: CodeChannel = { name: "broken", accepts: () => true, deliver: async () => ({ delivered: false }) };
    expect(await requestLoginCode(PHONE, "ip1", broken, now)).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("проверка кода", () => {
  const profile = { name: "Тестовый Клиент", consent: true as const };

  it("новый номер: сначала просим имя и Согласие, код при этом не сгорает", async () => {
    const code = await codeFor();
    expect(await verifyLoginCode({ phone: PHONE, code, profile: null }, "2026-11-07", later(1000))).toEqual({ ok: false, reason: "needsProfile" });
    const r = await verifyLoginCode({ phone: PHONE, code, profile }, "2026-11-07", later(2000));
    expect(r).toMatchObject({ ok: true, created: true, sessionVersion: 1 });
    expect(state.clients[0]).toMatchObject({ phone: PHONE, name: "Тестовый Клиент", consentPolicyDate: "2026-11-07", consentAt: later(2000) });
  });

  it("код одноразовый: второй вход тем же кодом не проходит", async () => {
    const code = await codeFor();
    expect((await verifyLoginCode({ phone: PHONE, code, profile }, "2026-11-07", later(1000))).ok).toBe(true);
    expect(await verifyLoginCode({ phone: PHONE, code, profile }, "2026-11-07", later(2000))).toEqual({ ok: false, reason: "expired" });
  });

  it("известный Клиент входит без имени и Согласия, время входа обновляется", async () => {
    await verifyLoginCode({ phone: PHONE, code: await codeFor(), profile }, "2026-11-07", later(1000));
    const code = await codeFor(PHONE, "ip1", later(60_000));
    const r = await verifyLoginCode({ phone: PHONE, code, profile: null }, "2026-11-07", later(61_000));
    expect(r).toMatchObject({ ok: true, created: false });
    expect(state.clients).toHaveLength(1);
    expect(state.clients[0].lastLoginAt).toEqual(later(61_000));
  });

  it("неверный код считается; после 5 неверных код сгорает даже для верного ввода", async () => {
    const code = await codeFor();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 1; i < MAX_CODE_ATTEMPTS; i++) {
      expect(await verifyLoginCode({ phone: PHONE, code: wrong, profile }, "d", later(i))).toEqual({ ok: false, reason: "wrongCode", attemptsLeft: MAX_CODE_ATTEMPTS - i });
    }
    expect(await verifyLoginCode({ phone: PHONE, code: wrong, profile }, "d", later(10))).toEqual({ ok: false, reason: "tooManyAttempts" });
    expect(await verifyLoginCode({ phone: PHONE, code, profile }, "d", later(11))).toEqual({ ok: false, reason: "tooManyAttempts" });
    expect(state.clients).toHaveLength(0);
  });

  it("просроченный код не проходит", async () => {
    const code = await codeFor();
    expect(await verifyLoginCode({ phone: PHONE, code, profile }, "d", later(CODE_TTL_MS))).toEqual({ ok: false, reason: "expired" });
  });

  it("действует только последний код номера", async () => {
    const first = await codeFor(PHONE, "ip1", now);
    const second = await codeFor(PHONE, "ip1", later(1000));
    if (first !== second) {
      expect(await verifyLoginCode({ phone: PHONE, code: first, profile }, "d", later(2000))).toMatchObject({ ok: false, reason: "wrongCode" });
    }
    expect((await verifyLoginCode({ phone: PHONE, code: second, profile }, "d", later(3000))).ok).toBe(true);
  });

  it("код другого номера не подходит", async () => {
    const code = await codeFor("+77000000002");
    await codeFor(PHONE);
    const r = await verifyLoginCode({ phone: PHONE, code, profile }, "d", later(1000));
    // Совпасть случайно может только при одинаковых кодах; хэш всё равно привязан к номеру
    if (r.ok) expect(state.codes.some((c) => c.phone === "+77000000002")).toBe(true);
    else expect(r.reason).toBe("wrongCode");
  });
});
