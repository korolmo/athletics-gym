import crypto from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { FAILURE_DELAY_MS, WINDOW_MS, evaluateAttempts, type LimitState } from "./login-limit.rules";

// Лимит попыток входа хранится в базе (таблица LoginAttempt).
// Любая ошибка базы здесь пробрасывается наверх: без работающего лимита вход запрещён.

/** Записи старше суток не нужны — чистим при каждой неудаче. */
const KEEP_MS = 24 * 60 * 60 * 1000;

/** IP клиента: на Vercel приходит в x-real-ip / x-forwarded-for. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** В базе храним не сам IP, а его хэш с секретом. */
function hashIp(ip: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "").update(ip).digest("hex");
}

export async function currentIpHash(): Promise<string> {
  return hashIp(await clientIp());
}

export async function checkLoginLimit(ipHash: string): Promise<LimitState> {
  const now = new Date();
  const rows = await db.loginAttempt.findMany({
    where: { ipHash, createdAt: { gt: new Date(now.getTime() - WINDOW_MS) } },
    select: { createdAt: true },
  });
  return evaluateAttempts(rows.map((r) => r.createdAt), now);
}

export async function recordFailedLogin(ipHash: string): Promise<void> {
  await db.loginAttempt.create({ data: { ipHash } });
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_MS) } } });
  await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
}

/** После успешного входа счётчик этого IP обнуляется. */
export async function clearFailedLogins(ipHash: string): Promise<void> {
  await db.loginAttempt.deleteMany({ where: { ipHash } });
}
