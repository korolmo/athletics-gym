import "server-only";
import { db } from "@/lib/db";

// Тренеры для публичного сайта: только видимые, с их видимыми Тарифами, без проверки сессии.
// Собирает их модуль Главная (ADR 0015). Тарифы — по связи Тренера (Тренеры зависят от Тарифов, не наоборот).

const tariffsByOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

export async function listVisibleTrainersWithTariffs() {
  return db.trainer.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { tariffs: { where: { isVisible: true }, orderBy: tariffsByOrder } },
  });
}
