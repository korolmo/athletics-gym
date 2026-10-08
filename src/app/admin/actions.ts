"use server";

import { redirect } from "next/navigation";
import { checkCredentials, createSession, destroySession } from "@/lib/auth";
import { checkLoginLimit, clearFailedLogins, currentIpHash, recordFailedLogin } from "@/lib/auth/login-limit";

export type LoginState = { error?: string } | undefined;

const UNAVAILABLE = "Вход временно недоступен. Попробуйте позже.";

/**
 * Проверяет лимит попыток и пароль. Возвращает текст ошибки или null, если вход разрешён.
 * Ошибка базы на любом шаге — отказ: без работающего лимита попыток в админку не пускаем.
 */
async function authenticate(loginValue: string, password: string): Promise<string | null> {
  try {
    // Сначала лимит: при блокировке пароль даже не сравниваем
    const ipHash = await currentIpHash();
    const limit = await checkLoginLimit(ipHash);
    if (limit.blocked) return `Слишком много попыток входа. Попробуйте через ${limit.retryAfterMin} мин.`;

    if (!checkCredentials(loginValue, password)) {
      await recordFailedLogin(ipHash);
      return "Неверный логин или пароль";
    }

    await clearFailedLogins(ipHash);
    return null;
  } catch (e) {
    console.error("Вход в админку: лимит попыток недоступен, вход отклонён.", e);
    return UNAVAILABLE;
  }
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Обрезаем: сравнение идёт по хэшу, длинная строка только тратит ресурсы
  const loginValue = String(formData.get("login") ?? "").trim().slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, 200);

  const error = await authenticate(loginValue, password);
  if (error) return { error };

  await createSession();
  redirect("/admin/tariffs");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
