import { describe, expect, it } from "vitest";
import { DEMO_PHONES, formatPhone, isDemoPhone, normalizePhone } from "./phone";
import { MAX_CODES_PER_PHONE, PHONE_WINDOW_MS, evaluateRequests, isCodeShape } from "./login-code.rules";
import { INACTIVE_DELETE_MS, isClientSessionCurrent, isInactive } from "./client";
import { readClientSession, signClientSession } from "./session";
import { readSession, signSession } from "@/modules/owner/client";

const SECRET = "x".repeat(40);

describe("телефон Клиента", () => {
  it.each([
    ["+7 (701) 234-56-78", "+77012345678"],
    ["87012345678", "+77012345678"],
    ["7012345678", "+77012345678"],
    ["  +7 777 000 11 22 ", "+77770001122"],
  ])("%s → %s", (input, out) => expect(normalizePhone(input)).toBe(out));

  it.each(["", "12345", "+7 7242 23-45-67", "+1 202 555 0100", "+7 (601) 234-56-78", "701234567890"])(
    "%s — не мобильный номер Казахстана",
    (input) => expect(normalizePhone(input)).toBeNull(),
  );

  it("показывается группами", () => expect(formatPhone("+77012345678")).toBe("+7 701 234 56 78"));

  it("тестовые номера Лаборатории — девять, и все проходят нормализацию", () => {
    expect(DEMO_PHONES).toHaveLength(9);
    for (const p of DEMO_PHONES) expect(normalizePhone(p)).toBe(p);
    expect(isDemoPhone("+77012345678")).toBe(false);
  });
});

describe("правила кода", () => {
  it("код — ровно 6 цифр", () => {
    expect(isCodeShape("012345")).toBe(true);
    expect(isCodeShape("12345")).toBe(false);
    expect(isCodeShape("12345a")).toBe(false);
  });

  it("лимит запросов: третий за 15 минут ещё можно, четвёртый — нет, и сказано, сколько ждать", () => {
    const now = new Date(1_800_000_000_000);
    const ago = (min: number) => new Date(now.getTime() - min * 60_000);
    expect(evaluateRequests([ago(1), ago(2)], now, MAX_CODES_PER_PHONE, PHONE_WINDOW_MS)).toEqual({ blocked: false });
    expect(evaluateRequests([ago(1), ago(2), ago(10)], now, MAX_CODES_PER_PHONE, PHONE_WINDOW_MS)).toEqual({ blocked: true, retryAfterMin: 5 });
    expect(evaluateRequests([ago(1), ago(2), ago(16)], now, MAX_CODES_PER_PHONE, PHONE_WINDOW_MS)).toEqual({ blocked: false });
  });
});

describe("Клиент", () => {
  it("сессия действует только с текущей версией", () => {
    expect(isClientSessionCurrent({ version: 2 }, 2)).toBe(true);
    expect(isClientSessionCurrent({ version: 1 }, 2)).toBe(false);
    expect(isClientSessionCurrent({ version: 1 }, null)).toBe(false);
  });

  it("неактивен — дольше 12 месяцев без входа", () => {
    const now = new Date(1_800_000_000_000);
    expect(isInactive(new Date(now.getTime() - INACTIVE_DELETE_MS + 1000), now)).toBe(false);
    expect(isInactive(new Date(now.getTime() - INACTIVE_DELETE_MS - 1000), now)).toBe(true);
  });
});

describe("сессия Клиента", () => {
  const session = { clientId: "ck123abc", version: 3, expiresAt: Date.now() + 60_000 };

  it("подписывается и читается", async () => {
    const token = await signClientSession(SECRET, session);
    expect(await readClientSession(token, SECRET)).toEqual(session);
  });

  it("подделка, чужой секрет и истёкший срок не проходят", async () => {
    const token = await signClientSession(SECRET, session);
    expect(await readClientSession(token.replace("v3", "v4"), SECRET)).toBeNull();
    expect(await readClientSession(token.replace("ck123abc", "ck999abc"), SECRET)).toBeNull();
    expect(await readClientSession(token, "y".repeat(40))).toBeNull();
    expect(await readClientSession(token, SECRET, session.expiresAt + 1)).toBeNull();
  });

  it("токен Клиента не открывает админку, а токен Владельца — кабинет", async () => {
    const clientToken = await signClientSession(SECRET, session);
    expect(await readSession(clientToken, SECRET)).toBeNull();
    const ownerToken = await signSession(SECRET, { version: 1, expiresAt: Date.now() + 60_000 });
    expect(await readClientSession(ownerToken, SECRET)).toBeNull();
  });

  it("подпись Клиента сделана другим ключом: перенос подписи в токен вида Владельца не проходит", async () => {
    const clientToken = await signClientSession(SECRET, session);
    const signature = clientToken.slice(clientToken.lastIndexOf(".") + 1);
    expect(await readSession(`admin.${session.expiresAt}.v1.${signature}`, SECRET)).toBeNull();
  });
});
