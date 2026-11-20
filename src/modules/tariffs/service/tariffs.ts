import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { requireOwner } from "@/modules/owner";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import type { HallId } from "../domain/tariff";
import type { TariffInput } from "../validation/tariff";
import type { ServiceResult } from "@/lib/services/result";

// Тарифы в админке: правила домена и доступ к базе.
// Каждая функция сама проверяет сессию Владельца — это и есть граница доступа к данным.

const byOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

/** Куда относится Тариф — нужно, чтобы вернуть Владельца в нужный список. */
export type TariffPlace = { hallId: string; trainerId: string | null };

/** Позиции прайса Зала и число Тарифов у Тренеров этого Зала (они правятся в карточках Тренеров). */
export async function listHallTariffs(clubId: string, hallId: HallId) {
  await requireOwner();
  const [tariffs, trainerTariffCount] = await Promise.all([
    dbFor(clubId).tariff.findMany({ where: { hallId, trainerId: null }, orderBy: byOrder }),
    dbFor(clubId).tariff.count({ where: { hallId, trainerId: { not: null } } }),
  ]);
  return { tariffs, trainerTariffCount };
}

export async function getTariff(clubId: string, id: string) {
  await requireOwner();
  return dbFor(clubId).tariff.findUnique({ where: { id } });
}

/**
 * Зал Тренера по его id (или null, если Тренера нет). Тарифы о Тренерах не знают (ADR 0015): эту функцию
 * берут из модуля Тренеры (`trainerHall`) и передают сюда действия админки.
 */
export type TrainerHallLookup = (trainerId: string) => Promise<string | null>;

/**
 * Создаёт или обновляет Тариф.
 * Правило: Тариф Тренера всегда лежит в Зале Тренера, что бы ни пришло из формы.
 */
export async function saveTariff(clubId: string, input: TariffInput, trainerHall: TrainerHallLookup): Promise<ServiceResult<TariffPlace>> {
  await requireOwner();
  const { id, ...fields } = input;

  let hallId: string = fields.hallId;
  if (fields.trainerId) {
    const trainerHallId = await trainerHall(fields.trainerId);
    if (!trainerHallId) return { ok: false, error: "Персональный тариф добавляется в карточке тренера" };
    hallId = trainerHallId;
  }
  const data = { ...fields, hallId };

  if (id) {
    try {
      await dbFor(clubId).tariff.update({ where: { id }, data });
    } catch (e) {
      // Тариф могли удалить в другой вкладке — сообщаем, а не падаем с ошибкой сервера
      if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
      throw e;
    }
  } else {
    // Новый Тариф встаёт в конец своего списка
    const last = await dbFor(clubId).tariff.aggregate({ where: { hallId, trainerId: data.trainerId }, _max: { sortOrder: true } });
    await dbFor(clubId).tariff.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }

  return { ok: true, hallId, trainerId: data.trainerId };
}

/**
 * Тарифы Тренера переезжают в его новый Зал. Возвращает запрос Prisma, не выполняя его: модуль Тренеры
 * кладёт его в одну транзакцию со сменой Зала Тренера — таблицу Тарифов при этом пишет только этот модуль.
 */
export function moveTrainerTariffs(clubId: string, trainerId: string, hallId: string) {
  return dbFor(clubId).tariff.updateMany({ where: { trainerId }, data: { hallId } });
}

/** Удаляет Тариф; если его уже нет — ничего не делает. Возвращает, где он был. */
export async function deleteTariff(clubId: string, id: string): Promise<TariffPlace | null> {
  await requireOwner();
  const tariff = id ? await dbFor(clubId).tariff.findUnique({ where: { id } }) : null;
  if (!tariff) return null;
  await dbFor(clubId).tariff.deleteMany({ where: { id } });
  return { hallId: tariff.hallId, trainerId: tariff.trainerId };
}

export async function toggleTariffVisibility(clubId: string, id: string): Promise<void> {
  await requireOwner();
  const tariff = await dbFor(clubId).tariff.findUnique({ where: { id } });
  if (tariff) {
    await dbFor(clubId).tariff.updateMany({ where: { id }, data: { isVisible: !tariff.isVisible } });
  }
}
