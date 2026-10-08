import "server-only";
import { db } from "@/lib/db";

// Данные публичного сайта: только то, что Владелец оставил видимым. Без проверки сессии.

const tariffsByOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

/** Позиции прайса Залов и Тренеры с их персональными Тарифами. */
export async function getPriceListAndTrainers() {
  const [hallTariffs, trainers] = await Promise.all([
    // Тарифы Тренеров приходят вместе с Тренерами
    db.tariff.findMany({ where: { isVisible: true, trainerId: null }, orderBy: tariffsByOrder }),
    db.trainer.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { tariffs: { where: { isVisible: true }, orderBy: tariffsByOrder } },
    }),
  ]);
  return { hallTariffs, trainers };
}
