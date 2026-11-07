import { db } from "@/lib/db";
import { ATTEMPT_KEEP_MS, FAILURE_DELAY_MS, WINDOW_MS, evaluateAttempts, type LimitState } from "../domain/login-limit.rules";

// Лимит попыток входа хранится в базе (таблица LoginAttempt).
// Любая ошибка базы здесь пробрасывается наверх: без работающего лимита вход запрещён.


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
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - ATTEMPT_KEEP_MS) } } });
  await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
}

/** После успешного входа счётчик этого IP обнуляется. */
export async function clearFailedLogins(ipHash: string): Promise<void> {
  await db.loginAttempt.deleteMany({ where: { ipHash } });
}
