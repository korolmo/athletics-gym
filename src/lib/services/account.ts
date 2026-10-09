import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { decidePasswordChange } from "@/lib/domain/owner";
import { OWNER_ID, findOwner, passwordTools } from "./owner-account";
import type { ServiceResult } from "./result";

// Раздел «Аккаунт»: смена пароля и отзыв сессий. Каждая функция сама проверяет сессию Владельца.

const GONE = "Аккаунт не найден. Войдите заново.";

export async function getAccountLogin(): Promise<string | null> {
  await requireOwner();
  return (await findOwner())?.login ?? null;
}

/**
 * Меняет пароль и увеличивает версию сессии: все выданные раньше сессии перестают действовать.
 * Возвращает новую версию — с ней вызывающий выдаёт куку этому устройству.
 */
export async function changeOwnerPassword(
  oldPassword: string,
  newPassword: string,
): Promise<ServiceResult<{ sessionVersion: number }>> {
  await requireOwner();
  const owner = await findOwner();
  if (!owner) return { ok: false, error: GONE };

  const change = await decidePasswordChange(owner, oldPassword, newPassword, passwordTools);
  if (!change.ok) return change;

  // Условие по старому хэшу: если пароль успели сменить в другом окне, эта смена не пройдёт
  const updated = await db.owner.updateMany({
    where: { id: OWNER_ID, passwordHash: owner.passwordHash },
    data: { passwordHash: change.passwordHash, sessionVersion: { increment: 1 } },
  });
  if (updated.count === 0) return { ok: false, error: "Пароль уже изменили в другом окне. Войдите заново." };

  const fresh = await db.owner.findUnique({ where: { id: OWNER_ID }, select: { sessionVersion: true } });
  return fresh ? { ok: true, sessionVersion: fresh.sessionVersion } : { ok: false, error: GONE };
}

/** «Выйти на всех устройствах»: следующая версия сессии — все куки, включая текущую, перестают подходить. */
export async function revokeAllSessions(): Promise<void> {
  await requireOwner();
  await db.owner.updateMany({ where: { id: OWNER_ID }, data: { sessionVersion: { increment: 1 } } });
}
