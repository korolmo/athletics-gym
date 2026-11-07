import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logError } from "@/lib/observability/log";
import { CLIENT_SESSION_COOKIE, CLIENT_SESSION_MAX_AGE_SEC, readClientSession, signClientSession } from "../domain/session";
import { isClientSessionCurrent, type ClientIdentity } from "../domain/client";

/** Выдаёт cookie сессии Клиента с версией из его аккаунта. */
export async function createClientSession(clientId: string, version: number): Promise<void> {
  const token = await signClientSession(process.env.AUTH_SECRET, {
    clientId,
    version,
    expiresAt: Date.now() + CLIENT_SESSION_MAX_AGE_SEC * 1000,
  });
  const store = await cookies();
  store.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CLIENT_SESSION_MAX_AGE_SEC,
  });
}

export async function destroyClientSession(): Promise<void> {
  const store = await cookies();
  store.delete(CLIENT_SESSION_COOKIE);
}

/**
 * Клиент текущего запроса или null: подпись и срок — из cookie, версия — из аккаунта в базе.
 * База недоступна — сессию не подтверждаем.
 */
export async function currentClient(): Promise<ClientIdentity | null> {
  const store = await cookies();
  const session = await readClientSession(store.get(CLIENT_SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  if (!session) return null;
  try {
    const row = await db.client.findUnique({
      where: { id: session.clientId },
      select: { id: true, phone: true, name: true, sessionVersion: true },
    });
    if (!row || !isClientSessionCurrent(session, row.sessionVersion)) return null;
    return { id: row.id, phone: row.phone, name: row.name };
  } catch (e) {
    logError("Кабинет: не удалось прочитать аккаунт Клиента, сессия не подтверждена.", e);
    return null;
  }
}

/**
 * Граница доступа к данным кабинета: каждое действие и каждое чтение данных кабинета начинается с неё.
 * Без действующей сессии — на страницу входа (`loginPath` с языком передаёт страница).
 */
export async function requireClient(loginPath = "/cabinet/login"): Promise<ClientIdentity> {
  const client = await currentClient();
  if (!client) redirect(loginPath);
  return client;
}
