import crypto from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, readSession, signSession } from "./session";

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkCredentials(login: string, password: string): boolean {
  const expectedLogin = process.env.ADMIN_LOGIN ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedLogin || !expectedPassword) return false;
  const loginOk = safeEqual(login, expectedLogin);
  const passwordOk = safeEqual(password, expectedPassword);
  return loginOk && passwordOk;
}

/**
 * Текущая версия сессии. Сейчас — из окружения (AUTH_SESSION_VERSION, по умолчанию 1):
 * увеличить число и передеплоить = разом отозвать все выданные сессии.
 * Этап 1: версия переезжает в аккаунт Владельца в базе, эта функция станет читать её оттуда.
 */
export async function currentSessionVersion(): Promise<number> {
  const raw = Number(process.env.AUTH_SESSION_VERSION ?? "1");
  return Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
}

export async function createSession(): Promise<void> {
  const token = await signSession(process.env.AUTH_SECRET, {
    version: await currentSessionVersion(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  return session !== null && session.version === (await currentSessionVersion());
}
