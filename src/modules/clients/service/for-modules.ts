import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Что модуль Клиенты отдаёт другим модулям (этап 1). Клиенты ни от кого не зависят: проверку Владельца
// для админки передаёт слой приложения аргументом, как хранилище Фото для health.

/**
 * Блокирует строку Клиента до конца транзакции (SELECT … FOR UPDATE): действия одного Клиента внутри неё идут по очереди.
 * Нужна Записям, чтобы лимит будущих Записей не обошли параллельные запросы. Таблица Клиента — наша, поэтому запрос здесь.
 */
export async function lockClient(tx: Prisma.TransactionClient, clientId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM Client WHERE id = ${clientId} FOR UPDATE`;
}

export type ClientContact = { id: string; name: string; phone: string };

/** Имена и телефоны Клиентов для раздела «Записи» админки. `ensureOwner` — requireOwner из слоя приложения. */
export async function getClientContacts(ids: string[], ensureOwner: () => Promise<void>): Promise<ClientContact[]> {
  await ensureOwner();
  if (ids.length === 0) return [];
  return db.client.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, phone: true } });
}
