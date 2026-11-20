import "server-only";
import { dbFor } from "@/lib/tenant-db";

// Тренеры для публичного сайта: только видимые, с их видимыми Тарифами, без проверки сессии.
// Собирает их модуль Главная (ADR 0015). Тарифы — по связи Тренера (Тренеры зависят от Тарифов, не наоборот).

const tariffsByOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

export async function listVisibleTrainersWithTariffs(clubId: string) {
  return dbFor(clubId).trainer.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { tariffs: { where: { isVisible: true }, orderBy: tariffsByOrder } },
  });
}

/** Тренер, к которому можно записаться: только видимый на сайте. Без сессии — для модуля Записи (этап 1). */
export async function getBookableTrainer(clubId: string, id: string): Promise<{ id: string; name: string; hallId: string } | null> {
  return dbFor(clubId).trainer.findFirst({ where: { id, isVisible: true }, select: { id: true, name: true, hallId: true } });
}

/** Имена Тренеров по id — для «Моих Записей» (и скрытых: запись к ним уже сделана). Без сессии. */
export async function getTrainerNames(clubId: string, ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const rows = await dbFor(clubId).trainer.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } });
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}
