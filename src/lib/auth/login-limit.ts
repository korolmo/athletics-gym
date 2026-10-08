import crypto from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { FAILURE_DELAY_MS, WINDOW_MS, evaluateAttempts, type LimitState } from "./login-limit.rules";

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

/** Таблицы ещё нет (миграция не применена): лимит не работает, но вход не ломаем. */
function isMissingTable(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2021";
}

function warnMissingTable() {
  console.error("LoginAttempt: таблицы нет — ограничение попыток входа выключено. Примените миграции (prisma migrate deploy).");
}

export async function currentIpHash(): Promise<string> {
  return hashIp(await clientIp());
}

export async function checkLoginLimit(ipHash: string): Promise<LimitState> {
  try {
    const now = new Date();
    const rows = await db.loginAttempt.findMany({
      where: { ipHash, createdAt: { gt: new Date(now.getTime() - WINDOW_MS) } },
      select: { createdAt: true },
    });
    return evaluateAttempts(rows.map((r) => r.createdAt), now);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    warnMissingTable();
    return { blocked: false };
  }
}

export async function recordFailedLogin(ipHash: string): Promise<void> {
  try {
    await db.loginAttempt.create({ data: { ipHash } });
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_MS) } } });
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    warnMissingTable();
  }
  await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
}

/** После успешного входа счётчик этого IP обнуляется. */
export async function clearFailedLogins(ipHash: string): Promise<void> {
  try {
    await db.loginAttempt.deleteMany({ where: { ipHash } });
  } catch (e) {
    if (!isMissingTable(e)) throw e;
  }
}
