import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ag_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET не задан или короче 32 символов (см. .env)");
  return s;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

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

export async function createSession(): Promise<void> {
  const payload = `admin.${Date.now() + MAX_AGE_SEC * 1000}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!safeEqual(signature, sign(payload))) return false;
  const exp = Number(payload.split(".")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}
