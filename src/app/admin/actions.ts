"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { checkLoginLimit, clearFailedLogins, currentIpHash, recordFailedLogin } from "@/lib/auth/login-limit";
import { loginOwner } from "@/lib/services/owner-account";

export type LoginState = { error?: string } | undefined;

const UNAVAILABLE = "Вход временно недоступен. Попробуйте позже.";

type Attempt = { ok: true; sessionVersion: number } | { ok: false; error: string };

/**
 * Проверяет лимит попыток и пароль. При успехе возвращает версию сессии Владельца.
 * Ошибка базы на любом шаге — отказ: без работающего лимита попыток в админку не пускаем.
 */
async function authenticate(loginValue: string, password: string): Promise<Attempt> {
  try {
    // Сначала лимит: при блокировке пароль даже не сравниваем
    const ipHash = await currentIpHash();
    const limit = await checkLoginLimit(ipHash);
    if (limit.blocked) return { ok: false, error: `Слишком много попыток входа. Попробуйте через ${limit.retryAfterMin} мин.` };

    const result = await loginOwner(loginValue, password);
    if (!result.ok) {
      await recordFailedLogin(ipHash);
      return { ok: false, error: "Неверный логин или пароль" };
    }

    await clearFailedLogins(ipHash);
    return result;
  } catch (e) {
    console.error("Вход в админку: база недоступна, вход отклонён.", e);
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Обрезаем: длинная строка только тратит ресурсы
  const loginValue = String(formData.get("login") ?? "").trim().slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 200);

  const attempt = await authenticate(loginValue, password);
  if (!attempt.ok) return { error: attempt.error };

  await createSession(attempt.sessionVersion);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
