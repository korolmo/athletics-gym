"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/modules/owner";
import { checkLoginLimit, recordFailedLogin } from "@/modules/owner";
import { currentIpHash } from "@/lib/ip-hash";
import { requireOwner } from "@/modules/owner";
import { parsePasswordChangeForm } from "@/modules/owner";
import * as account from "@/modules/owner";

export type PasswordFormState = { error?: string } | undefined;

/**
 * Смена пароля. Неверный текущий пароль считается неудачной попыткой входа: лимит общий,
 * чтобы с чужой открытой сессии нельзя было подбирать пароль без ограничений.
 */
export async function changePassword(_prev: PasswordFormState, fd: FormData): Promise<PasswordFormState> {
  await requireOwner();
  const parsed = parsePasswordChangeForm(fd);
  if (!parsed.ok) return { error: parsed.error };

  const ipHash = await currentIpHash();
  const limit = await checkLoginLimit(ipHash);
  if (limit.blocked) return { error: `Слишком много попыток. Попробуйте через ${limit.retryAfterMin} мин.` };

  const result = await account.changeOwnerPassword(parsed.data.oldPassword, parsed.data.newPassword);
  if (!result.ok) {
    await recordFailedLogin(ipHash);
    return { error: result.error };
  }

  // Старые сессии погашены новой версией; этому устройству выдаём куку уже с ней
  await createSession(result.sessionVersion);
  redirect("/admin/account?changed=1");
}

/** «Выйти на всех устройствах»: гасит все сессии, включая эту. */
export async function logoutEverywhere(): Promise<void> {
  await requireOwner();
  await account.revokeAllSessions();
  await destroySession();
  redirect("/admin/login");
}
