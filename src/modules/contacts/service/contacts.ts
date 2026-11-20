import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { requireOwner } from "@/modules/owner";
import { statsSince, summarizeContacts, type ContactInput, type ContactStats } from "../domain/contact";

// Обращения: запись нажатия (сайт, без сессии) и сводка для Владельца.

/** Записывает одно Обращение: Канал, Источник, язык. Ничего о самом Посетителе в запись не попадает. */
export async function recordContact(clubId: string, input: ContactInput): Promise<void> {
  await dbFor(clubId).contactClick.create({ data: { channel: input.channel, source: input.source, locale: input.locale } });
}

/** Сводка Обращений за 30 дней для главной страницы админки. */
export async function getContactStats(clubId: string, now: Date = new Date()): Promise<ContactStats> {
  await requireOwner();
  const clicks = await dbFor(clubId).contactClick.findMany({
    where: { createdAt: { gte: statsSince(now) } },
    select: { channel: true, source: true, createdAt: true },
  });
  return summarizeContacts(clicks, now);
}
