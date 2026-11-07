// Аккаунт Владельца: правила входа, смены пароля и отзыва сессий — чистые функции.
// Хэширование передаётся снаружи, базы здесь нет: правила проверяются тестами.

import crypto from "node:crypto";

export type OwnerAccount = { login: string; passwordHash: string; sessionVersion: number };

export type PasswordTools = {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
};

/** Сравнение строк за постоянное время. */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export type LoginDecision =
  | { ok: false }
  /** `create` — Владельца в базе ещё нет: первый вход по переменным окружения, аккаунт нужно завести */
  | { ok: true; sessionVersion: number; create?: { login: string; passwordHash: string } };

/**
 * Вход в админку. Если аккаунт Владельца в базе есть — сверяем с ним, переменные окружения не участвуют.
 * Если его ещё нет — пускаем по ADMIN_LOGIN / ADMIN_PASSWORD и возвращаем аккаунт, который нужно создать.
 */
export async function decideLogin(
  input: { login: string; password: string },
  owner: OwnerAccount | null,
  env: { login?: string; password?: string },
  tools: PasswordTools,
): Promise<LoginDecision> {
  if (owner) {
    // Хэш сверяем и при неверном логине: время ответа не должно выдавать, какой из двух неверен
    const passwordOk = await tools.verify(input.password, owner.passwordHash);
    const loginOk = safeEqual(input.login, owner.login);
    return loginOk && passwordOk ? { ok: true, sessionVersion: owner.sessionVersion } : { ok: false };
  }

  if (!env.login || !env.password) return { ok: false };
  const loginOk = safeEqual(input.login, env.login);
  const passwordOk = safeEqual(input.password, env.password);
  if (!loginOk || !passwordOk) return { ok: false };
  return { ok: true, sessionVersion: 1, create: { login: env.login, passwordHash: await tools.hash(input.password) } };
}

export type PasswordChange = { ok: true; passwordHash: string; sessionVersion: number } | { ok: false; error: string };

/**
 * Смена пароля: нужен действующий пароль. Новая версия сессии на единицу больше —
 * все выданные раньше сессии перестают подходить (S4 из ревью от 8 октября).
 */
export async function decidePasswordChange(
  owner: OwnerAccount,
  oldPassword: string,
  newPassword: string,
  tools: PasswordTools,
): Promise<PasswordChange> {
  if (!(await tools.verify(oldPassword, owner.passwordHash))) return { ok: false, error: "Текущий пароль введён неверно" };
  return { ok: true, passwordHash: await tools.hash(newPassword), sessionVersion: nextSessionVersion(owner.sessionVersion) };
}

/** «Выйти на всех устройствах» и смена пароля: следующая версия сессии. */
export function nextSessionVersion(current: number): number {
  return current + 1;
}

/** Сессия действует, только пока её версия совпадает с версией в аккаунте Владельца. */
export function isSessionCurrent(session: { version: number } | null, ownerVersion: number | null): boolean {
  return session !== null && ownerVersion !== null && session.version === ownerVersion;
}
