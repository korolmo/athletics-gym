import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decideLogin, type OwnerAccount } from "@/lib/domain/owner";

// Аккаунт Владельца для входа и проверки сессии. Здесь сессию не проверяем:
// этими функциями она и устанавливается. Смена пароля и отзыв сессий — в services/account.ts.

/** В базе одна запись Владельца. */
export const OWNER_ID = "owner";

export const passwordTools = { hash: hashPassword, verify: verifyPassword };

export async function findOwner(): Promise<OwnerAccount | null> {
  return db.owner.findUnique({
    where: { id: OWNER_ID },
    select: { login: true, passwordHash: true, sessionVersion: true },
  });
}

/**
 * Текущая версия сессии из аккаунта Владельца; null — аккаунта ещё нет (до первого входа).
 * В пределах одного рендера страницы база спрашивается один раз.
 */
export const getOwnerSessionVersion = cache(async (): Promise<number | null> => {
  const owner = await db.owner.findUnique({ where: { id: OWNER_ID }, select: { sessionVersion: true } });
  return owner?.sessionVersion ?? null;
});

/**
 * Проверяет логин и пароль. Возвращает версию сессии, с которой нужно выдать куку.
 * Первый вход после переезда: Владельца в базе нет — сверяем с ADMIN_LOGIN / ADMIN_PASSWORD и заводим аккаунт.
 */
export async function loginOwner(
  login: string,
  password: string,
): Promise<{ ok: true; sessionVersion: number } | { ok: false }> {
  const decision = await decideLogin(
    { login, password },
    await findOwner(),
    { login: process.env.ADMIN_LOGIN, password: process.env.ADMIN_PASSWORD },
    passwordTools,
  );
  if (!decision.ok) return { ok: false };
  if (!decision.create) return { ok: true, sessionVersion: decision.sessionVersion };

  // Два первых входа одновременно: запись одна (id = "owner"), второй вход её не перезапишет
  const owner = await db.owner.upsert({
    where: { id: OWNER_ID },
    create: { id: OWNER_ID, ...decision.create },
    update: {},
    select: { sessionVersion: true },
  });
  return { ok: true, sessionVersion: owner.sessionVersion };
}
