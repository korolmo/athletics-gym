import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import type { HallId } from "@/lib/domain/tariff";
import { sortOrderOnCreate, sortOrderOnUpdate } from "@/lib/domain/trainer";
import type { TrainerInput } from "@/lib/validation/trainer";
import { removeObjects } from "@/lib/storage/client";
import type { ServiceResult } from "./result";

// Тренеры в админке: правила домена и доступ к базе.
// Каждая функция сама проверяет сессию Владельца — это и есть граница доступа к данным.

const byOrder = [{ sortOrder: "asc" as const }, { name: "asc" as const }];
const tariffsByOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

/** Тренеры Зала с их видимыми на сайте Тарифами. */
export async function listTrainers(hallId: HallId) {
  await requireOwner();
  return db.trainer.findMany({
    where: { hallId },
    orderBy: byOrder,
    include: { tariffs: { where: { isVisible: true } } },
  });
}

/** Тренер со всеми его Тарифами (включая скрытые) — для карточки в админке. */
export async function getTrainerWithTariffs(id: string) {
  await requireOwner();
  return db.trainer.findUnique({ where: { id }, include: { tariffs: { orderBy: tariffsByOrder } } });
}

export async function getTrainer(id: string) {
  await requireOwner();
  return db.trainer.findUnique({ where: { id } });
}

/**
 * Создаёт или обновляет Тренера.
 * Правила: Тарифы Тренера переезжают в его Зал вместе с ним;
 * новый Тренер без заданного порядка встаёт в конец списка своего Зала;
 * при правке пустой порядок значит «не менять».
 */
export async function saveTrainer(input: TrainerInput): Promise<ServiceResult<{ id: string }>> {
  await requireOwner();
  const { id, sortOrder, ...data } = input;

  if (id) {
    try {
      await db.$transaction([
        db.trainer.update({ where: { id }, data: { ...data, ...sortOrderOnUpdate(sortOrder) } }),
        db.tariff.updateMany({ where: { trainerId: id }, data: { hallId: data.hallId } }),
      ]);
    } catch (e) {
      // Тренера могли удалить в другой вкладке — сообщаем, а не падаем с ошибкой сервера
      if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
      throw e;
    }
    return { ok: true, id };
  }

  // Фото загрузим на этапе 2
  const last = await db.trainer.aggregate({ where: { hallId: data.hallId }, _max: { sortOrder: true } });
  const created = await db.trainer.create({
    data: { ...data, sortOrder: sortOrderOnCreate(sortOrder, last._max.sortOrder) },
  });
  return { ok: true, id: created.id };
}

/** Удаляет Тренера вместе с его Тарифами (каскад в схеме) и загруженным Плакатом. Возвращает Зал, где он был. */
export async function deleteTrainer(id: string): Promise<{ hallId: string } | null> {
  await requireOwner();
  const trainer = id ? await db.trainer.findUnique({ where: { id } }) : null;
  if (!trainer) return null;
  await db.trainer.deleteMany({ where: { id } });
  // Загруженный Плакат Тренера удаляем и из хранилища; если не вышло — файл подберёт уборка
  if (trainer.uploadedPhoto) {
    await removeObjects([trainer.uploadedPhoto]).catch((e) => console.error("Хранилище фото: плакат удалённого Тренера остался.", e));
  }
  return { hallId: trainer.hallId };
}

export async function toggleTrainerVisibility(id: string): Promise<void> {
  await requireOwner();
  const trainer = await db.trainer.findUnique({ where: { id } });
  if (trainer) {
    await db.trainer.updateMany({ where: { id }, data: { isVisible: !trainer.isVisible } });
  }
}
