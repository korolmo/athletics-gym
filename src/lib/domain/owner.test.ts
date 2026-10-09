import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { readSession, signSession } from "@/lib/auth/session";
import { decideLogin, decidePasswordChange, isSessionCurrent, nextSessionVersion, type OwnerAccount } from "./owner";

// Настоящий bcrypt, но с малой стоимостью — чтобы тесты шли быстро
const tools = { hash: (p: string) => hashPassword(p, 4), verify: verifyPassword };

const SECRET = "test-secret-test-secret-test-secret-0123456789";
const HOUR = 60 * 60 * 1000;
const ENV = { login: "admin", password: "env-password" };

async function owner(password = "old-password", sessionVersion = 3): Promise<OwnerAccount> {
  return { login: "owner", passwordHash: await tools.hash(password), sessionVersion };
}

describe("хэш пароля", () => {
  it("пароль подходит к своему хэшу и не подходит к чужому", async () => {
    const hash = await tools.hash("correct horse");
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("correct horsE", hash)).toBe(false);
  });

  it("пароль длиннее предела bcrypt не подходит, даже если начало совпадает", async () => {
    const base = "a".repeat(72);
    const hash = await tools.hash(base);
    expect(await verifyPassword(base, hash)).toBe(true);
    expect(await verifyPassword(`${base}b`, hash)).toBe(false);
  });
});

describe("вход: аккаунт Владельца в базе", () => {
  it("верные логин и пароль — вход с версией сессии из аккаунта", async () => {
    const r = await decideLogin({ login: "owner", password: "old-password" }, await owner(), ENV, tools);
    expect(r).toEqual({ ok: true, sessionVersion: 3 });
  });

  it("неверный пароль или логин — отказ", async () => {
    const acc = await owner();
    expect(await decideLogin({ login: "owner", password: "wrong" }, acc, ENV, tools)).toEqual({ ok: false });
    expect(await decideLogin({ login: "someone", password: "old-password" }, acc, ENV, tools)).toEqual({ ok: false });
  });

  it("логин и пароль из переменных окружения больше не подходят", async () => {
    const r = await decideLogin({ login: ENV.login, password: ENV.password }, await owner(), ENV, tools);
    expect(r).toEqual({ ok: false });
  });
});

describe("вход: первый раз после переезда, Владельца в базе ещё нет", () => {
  it("логин и пароль из окружения — вход и аккаунт для создания с хэшем этого пароля", async () => {
    const r = await decideLogin({ login: "admin", password: "env-password" }, null, ENV, tools);
    expect(r.ok).toBe(true);
    if (!r.ok || !r.create) throw new Error("ожидали аккаунт для создания");
    expect(r.sessionVersion).toBe(1);
    expect(r.create.login).toBe("admin");
    expect(r.create.passwordHash).not.toContain("env-password");
    expect(await verifyPassword("env-password", r.create.passwordHash)).toBe(true);
  });

  it("неверные данные — отказ, аккаунт не создаётся", async () => {
    expect(await decideLogin({ login: "admin", password: "wrong" }, null, ENV, tools)).toEqual({ ok: false });
    expect(await decideLogin({ login: "root", password: "env-password" }, null, ENV, tools)).toEqual({ ok: false });
  });

  it("переменные окружения не заданы — войти нельзя, пустые строки не подходят", async () => {
    expect(await decideLogin({ login: "", password: "" }, null, {}, tools)).toEqual({ ok: false });
    expect(await decideLogin({ login: "", password: "" }, null, { login: "", password: "" }, tools)).toEqual({ ok: false });
  });
});

describe("смена пароля", () => {
  it("неверный текущий пароль — отказ, ничего не меняется", async () => {
    const r = await decidePasswordChange(await owner(), "not-the-password", "brand-new-password", tools);
    expect(r).toEqual({ ok: false, error: "Текущий пароль введён неверно" });
  });

  it("новый пароль работает, старый — нет, версия сессии выросла", async () => {
    const before = await owner("old-password", 3);
    const r = await decidePasswordChange(before, "old-password", "brand-new-password", tools);
    if (!r.ok) throw new Error(r.error);
    expect(r.sessionVersion).toBe(4);

    const after: OwnerAccount = { ...before, passwordHash: r.passwordHash, sessionVersion: r.sessionVersion };
    expect(await decideLogin({ login: "owner", password: "brand-new-password" }, after, ENV, tools)).toEqual({
      ok: true,
      sessionVersion: 4,
    });
    expect(await decideLogin({ login: "owner", password: "old-password" }, after, ENV, tools)).toEqual({ ok: false });
  });

  it("сессия, выданная до смены пароля, перестаёт действовать; новая — действует", async () => {
    const before = await owner("old-password", 3);
    const oldCookie = await signSession(SECRET, { version: before.sessionVersion, expiresAt: Date.now() + HOUR });
    const r = await decidePasswordChange(before, "old-password", "brand-new-password", tools);
    if (!r.ok) throw new Error(r.error);
    const newCookie = await signSession(SECRET, { version: r.sessionVersion, expiresAt: Date.now() + HOUR });

    // Подпись и срок старой куки в порядке — отзывает её именно версия
    const oldSession = await readSession(oldCookie, SECRET);
    expect(oldSession).not.toBeNull();
    expect(isSessionCurrent(oldSession, r.sessionVersion)).toBe(false);
    expect(isSessionCurrent(await readSession(newCookie, SECRET), r.sessionVersion)).toBe(true);
  });
});

describe("версия сессии", () => {
  it("«Выйти на всех устройствах»: следующая версия гасит все выданные сессии", () => {
    const next = nextSessionVersion(7);
    expect(next).toBe(8);
    expect(isSessionCurrent({ version: 7 }, next)).toBe(false);
  });

  it("сессия действует только при точном совпадении версий", () => {
    expect(isSessionCurrent({ version: 2 }, 2)).toBe(true);
    expect(isSessionCurrent({ version: 1 }, 2)).toBe(false);
    expect(isSessionCurrent({ version: 3 }, 2)).toBe(false);
  });

  it("нет сессии или нет аккаунта Владельца — доступа нет", () => {
    expect(isSessionCurrent(null, 1)).toBe(false);
    // Кука, выданная до переезда аккаунта в базу, не подходит, пока Владелец не войдёт заново
    expect(isSessionCurrent({ version: 1 }, null)).toBe(false);
  });
});
