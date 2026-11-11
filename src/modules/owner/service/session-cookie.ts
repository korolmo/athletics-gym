import { cookies } from "next/headers";
import { isSessionCurrent } from "../domain/owner";
import { getOwnerSessionVersion } from "./owner-account";
import { GUEST_SESSION_MAX_AGE_SEC, SESSION_COOKIE, SESSION_MAX_AGE_SEC, readSession, signSession, type SessionRole } from "../domain/session";
import { logError } from "@/lib/observability/log";

/**
 * Выдаёт куку сессии с версией из аккаунта Владельца на момент входа. Гость демо-админки (этап П1) получает ту же
 * куку с ролью «guest» и сроком 2 часа; «Выйти на всех устройствах» Владельца закрывает и гостевые сессии.
 */
export async function createSession(version: number, role: SessionRole = "owner"): Promise<void> {
  const maxAge = role === "guest" ? GUEST_SESSION_MAX_AGE_SEC : SESSION_MAX_AGE_SEC;
  const token = await signSession(process.env.AUTH_SECRET, { version, role, expiresAt: Date.now() + maxAge * 1000 });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
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
export async function currentRole(): Promise<SessionRole | null> {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET);
  if (!session) return null;
  try {
    return isSessionCurrent(session, await getOwnerSessionVersion()) ? session.role : null;
  } catch (e) {
    logError("Админка: не удалось прочитать версию сессии из базы, сессия не подтверждена.", e);
    return null;
  }
}

/** Вошёл ли кто-то в админку — Владелец или Гость демо-админки. */
export async function isAuthed(): Promise<boolean> {
  return (await currentRole()) !== null;
}

/** Сейчас в админке Гость демо-админки (этап П1): ему закрыты опасные действия и видны скрытые телефоны. */
export async function isGuest(): Promise<boolean> {
  return (await currentRole()) === "guest";
}
