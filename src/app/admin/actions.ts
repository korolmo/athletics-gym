"use server";

import { redirect } from "next/navigation";
import { checkCredentials, createSession, destroySession } from "@/lib/auth";
import { checkLoginLimit, clearFailedLogins, currentIpHash, recordFailedLogin } from "@/lib/auth/login-limit";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginValue = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Сначала лимит: при блокировке пароль даже не сравниваем
  const ipHash = await currentIpHash();
  const limit = await checkLoginLimit(ipHash);
  if (limit.blocked) {
    return { error: `Слишком много попыток входа. Попробуйте через ${limit.retryAfterMin} мин.` };
  }

  if (!checkCredentials(loginValue, password)) {
    await recordFailedLogin(ipHash);
    return { error: "Неверный логин или пароль" };
  }

  await clearFailedLogins(ipHash);
  await createSession();
  redirect("/admin/tariffs");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
