"use server";

import { redirect } from "next/navigation";
import { checkCredentials, createSession, destroySession } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginValue = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!checkCredentials(loginValue, password)) {
    return { error: "Неверный логин или пароль" };
  }
  await createSession();
  redirect("/admin/tariffs");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
