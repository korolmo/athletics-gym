import "server-only";
import { db } from "@/lib/db";
import { INACTIVE_DELETE_MS } from "../domain/client";
import { requireClient } from "./session-cookie";

// Профиль Клиента: имя, «Выйти на всех устройствах», удаление аккаунта (ADR 0016). Каждое действие — от имени
// Клиента текущей сессии: id из формы не берём.

export async function updateClientName(name: string): Promise<void> {
  const client = await requireClient();
  await db.client.update({ where: { id: client.id }, data: { name } });
}

/** Увеличивает версию сессии: все выданные раньше cookie перестают подходить, в том числе текущая. */
export async function revokeAllClientSessions(): Promise<void> {
  const client = await requireClient();
  await db.client.update({ where: { id: client.id }, data: { sessionVersion: { increment: 1 } } });
}

/**
 * Удаление аккаунта самим Клиентом: запись Клиента и его коды входа удаляются целиком.
 * Записи к Тренерам (этап 1, модуль bookings) обезличиваются ссылкой с onDelete: SetNull.
 */
export async function deleteClientAccount(): Promise<void> {
  const client = await requireClient();
  await db.$transaction([
    db.clientLoginCode.deleteMany({ where: { phone: client.phone } }),
    db.client.delete({ where: { id: client.id } }),
  ]);
}

/** Удаление аккаунтов без входа дольше срока из правил — вызывает cron (без сессии: это не действие Клиента). */
export async function deleteInactiveClients(now: Date = new Date()): Promise<number> {
  const { count } = await db.client.deleteMany({ where: { lastLoginAt: { lt: new Date(now.getTime() - INACTIVE_DELETE_MS) } } });
  return count;
}
