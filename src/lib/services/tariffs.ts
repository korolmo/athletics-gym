import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import type { HallId } from "@/lib/domain/tariff";
import type { TariffInput } from "@/lib/validation/tariff";
import type { ServiceResult } from "./result";

// Тарифы в админке: правила домена и доступ к базе.
// Каждая функция сама проверяет сессию Владельца — это и есть граница доступа к данным.

const byOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

/** Куда относится Тариф — нужно, чтобы вернуть Владельца в нужный список. */
export type TariffPlace = { hallId: string; trainerId: string | null };

/** Позиции прайса Зала и число Тарифов у Тренеров этого Зала (они правятся в карточках Тренеров). */
export async function listHallTariffs(hallId: HallId) {
  await requireOwner();
  const [tariffs, trainerTariffCount] = await Promise.all([
    db.tariff.findMany({ where: { hallId, trainerId: null }, orderBy: byOrder }),
    db.tariff.count({ where: { hallId, trainerId: { not: null } } }),
  ]);
  return { tariffs, trainerTariffCount };
}

export async function getTariff(id: string) {
  await requireOwner();
  return db.tariff.findUnique({ where: { id }, include: { trainer: true } });
}

/**
 * Создаёт или обновляет Тариф.
 * Правило: Тариф Тренера всегда лежит в Зале Тренера, что бы ни пришло из формы.
 */
export async function saveTariff(input: TariffInput): Promise<ServiceResult<TariffPlace>> {
  await requireOwner();
  const { id, ...fields } = input;

  let hallId: string = fields.hallId;
  if (fields.trainerId) {
    const trainer = await db.trainer.findUnique({ where: { id: fields.trainerId } });
    if (!trainer) return { ok: false, error: "Персональный тариф добавляется в карточке тренера" };
    hallId = trainer.hallId;
  }
  const data = { ...fields, hallId };

  if (id) {
    try {
      await db.tariff.update({ where: { id }, data });
    } catch (e) {
      // Тариф могли удалить в другой вкладке — сообщаем, а не падаем с ошибкой сервера
      if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
      throw e;
    }
  } else {
    // Новый Тариф встаёт в конец своего списка
    const last = await db.tariff.aggregate({ where: { hallId, trainerId: data.trainerId }, _max: { sortOrder: true } });
    await db.tariff.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }

  return { ok: true, hallId, trainerId: data.trainerId };
}

/** Удаляет Тариф; если его уже нет — ничего не делает. Возвращает, где он был. */
export async function deleteTariff(id: string): Promise<TariffPlace | null> {
  await requireOwner();
  const tariff = id ? await db.tariff.findUnique({ where: { id } }) : null;
  if (!tariff) return null;
  await db.tariff.deleteMany({ where: { id } });
  return { hallId: tariff.hallId, trainerId: tariff.trainerId };
}

export async function toggleTariffVisibility(id: string): Promise<void> {
  await requireOwner();
  const tariff = await db.tariff.findUnique({ where: { id } });
  if (tariff) {
    await db.tariff.updateMany({ where: { id }, data: { isVisible: !tariff.isVisible } });
  }
}
