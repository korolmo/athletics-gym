import { cookies } from "next/headers";
import { isSessionCurrent } from "@/lib/domain/owner";
import { getOwnerSessionVersion } from "@/lib/services/owner-account";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, readSession, signSession } from "./session";

/** Выдаёт куку сессии с версией из аккаунта Владельца на момент входа. */
export async function createSession(version: number): Promise<void> {
  const token = await signSession(process.env.AUTH_SECRET, {
    version,
    expiresAt: Date.now() + SESSION_MAX_AGE_SEC * 1000,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Действует ли сессия: подпись и срок — из куки, версия — из аккаунта Владельца в базе.
 * Смена пароля и «Выйти на всех устройствах» увеличивают версию, и старые куки перестают подходить.
 * База недоступна — сессию не подтверждаем: в админку без проверки не пускаем.
 */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  if (!session) return false;
  try {
    return isSessionCurrent(session, await getOwnerSessionVersion());
  } catch (e) {
    console.error("Админка: не удалось прочитать версию сессии из базы, сессия не подтверждена.", e);
    return false;
  }
}
