import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { statsSince, summarizeContacts, type ContactInput, type ContactStats } from "@/lib/domain/contact";

// Обращения: запись нажатия (сайт, без сессии) и сводка для Владельца.

/** Записывает одно Обращение: Канал, Источник, язык. Ничего о самом Посетителе в запись не попадает. */
export async function recordContact(input: ContactInput): Promise<void> {
  await db.contactClick.create({ data: { channel: input.channel, source: input.source, locale: input.locale } });
}

/** Сводка Обращений за 30 дней для главной страницы админки. */
export async function getContactStats(now: Date = new Date()): Promise<ContactStats> {
  await requireOwner();
  const clicks = await db.contactClick.findMany({
    where: { createdAt: { gte: statsSince(now) } },
    select: { channel: true, source: true, createdAt: true },
  });
  return summarizeContacts(clicks, now);
}
