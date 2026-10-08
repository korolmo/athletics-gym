import { describe, expect, it } from "vitest";
import { readSession, signSession } from "./session";

const SECRET = "test-secret-test-secret-test-secret-0123456789";
const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("подпись сессии", () => {
  it("подписанный токен читается обратно", async () => {
    const token = await signSession(SECRET, { version: 1, expiresAt: NOW + HOUR });
    expect(token).toMatch(/^admin\.\d+\.v1\.[0-9a-f]{64}$/);
    expect(await readSession(token, SECRET, NOW)).toEqual({ version: 1, expiresAt: NOW + HOUR });
  });

  it("версия входит в подпись и возвращается при чтении", async () => {
    const token = await signSession(SECRET, { version: 7, expiresAt: NOW + HOUR });
    expect((await readSession(token, SECRET, NOW))?.version).toBe(7);
    // подменить версию, не зная секрета, нельзя
    expect(await readSession(token.replace(".v7.", ".v8."), SECRET, NOW)).toBeNull();
  });

  it("просроченный токен не принимается", async () => {
    const token = await signSession(SECRET, { version: 1, expiresAt: NOW - 1 });
    expect(await readSession(token, SECRET, NOW)).toBeNull();
  });

  it("продлить срок, не зная секрета, нельзя", async () => {
    const token = await signSession(SECRET, { version: 1, expiresAt: NOW + HOUR });
    const forged = token.replace(String(NOW + HOUR), String(NOW + 1000 * HOUR));
    expect(await readSession(forged, SECRET, NOW)).toBeNull();
  });

  it("токен, подписанный другим секретом, не принимается", async () => {
    const token = await signSession("another-secret-another-secret-another-0123", { version: 1, expiresAt: NOW + HOUR });
    expect(await readSession(token, SECRET, NOW)).toBeNull();
  });

  it.each([
    ["пусто", undefined],
    ["пустая строка", ""],
    ["без точек", "garbage"],
    ["не hex в подписи", "admin.1900000000000.v1.zzzz"],
    ["старый формат без версии", "admin.1900000000000.abcdef"],
    ["чужая роль", "owner.1900000000000.v1.abcdef"],
  ])("мусор вместо токена: %s", async (_name, token) => {
    expect(await readSession(token, SECRET, NOW)).toBeNull();
  });

  it("без секрета или с коротким секретом — ошибка настройки, а не тихий пропуск", async () => {
    await expect(signSession(undefined, { version: 1, expiresAt: NOW + HOUR })).rejects.toThrow(/AUTH_SECRET/);
    await expect(signSession("short", { version: 1, expiresAt: NOW + HOUR })).rejects.toThrow(/AUTH_SECRET/);
    const token = await signSession(SECRET, { version: 1, expiresAt: NOW + HOUR });
    await expect(readSession(token, "short", NOW)).rejects.toThrow(/AUTH_SECRET/);
  });
});
