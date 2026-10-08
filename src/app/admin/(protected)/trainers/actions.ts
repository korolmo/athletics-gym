"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { checked, text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { LIMITS } from "@/lib/admin/limits";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import { isHall } from "@/lib/domain/tariff";

export type TrainerFormState = { error?: string } | undefined;

export async function saveTrainer(_prev: TrainerFormState, fd: FormData): Promise<TrainerFormState> {
  await requireOwner();

  const id = text(fd, "id");
  const name = text(fd, "name");
  const hallId = text(fd, "hallId");
  const rawOrder = text(fd, "sortOrder");

  if (!name) return { error: "Заполните имя" };
  if (name.length > LIMITS.name) return { error: `Имя — не длиннее ${LIMITS.name} символов` };
  if (!isHall(hallId)) return { error: "Выберите зал" };
  const sortOrder = rawOrder === "" ? null : Number(rawOrder);
  if (sortOrder !== null && (!Number.isInteger(sortOrder) || sortOrder < 0)) {
    return { error: "Порядок — целое число от 0" };
  }
  if (sortOrder !== null && sortOrder > LIMITS.sortOrder) return { error: `Порядок — не больше ${LIMITS.sortOrder}` };

  const descriptionRu = text(fd, "descriptionRu") || null;
  const descriptionKk = text(fd, "descriptionKk") || null;
  if ((descriptionRu?.length ?? 0) > LIMITS.description || (descriptionKk?.length ?? 0) > LIMITS.description) {
    return { error: `Описание — не длиннее ${LIMITS.description} символов` };
  }

  const data = {
    name,
    hallId,
    descriptionRu,
    descriptionKk,
    isVisible: checked(fd, "isVisible"),
  };

  let savedId = id;
  if (id) {
    // Тарифы Тренера переезжают в его Зал вместе с ним
    try {
      await db.$transaction([
        db.trainer.update({ where: { id }, data: { ...data, sortOrder: sortOrder ?? 0 } }),
        db.tariff.updateMany({ where: { trainerId: id }, data: { hallId } }),
      ]);
    } catch (e) {
      // Тренера могли удалить в другой вкладке — сообщаем, а не падаем с ошибкой сервера
      if (isNotFound(e)) return { error: NOT_FOUND_MESSAGE };
      throw e;
    }
  } else {
    // Новый Тренер встаёт в конец списка своего Зала; фото загрузим на этапе 2
    const last = await db.trainer.aggregate({ where: { hallId }, _max: { sortOrder: true } });
    const created = await db.trainer.create({
      data: { ...data, sortOrder: sortOrder ?? (last._max.sortOrder ?? -1) + 1 },
    });
    savedId = created.id;
  }

  revalidateSite();
  redirect(`/admin/trainers/${savedId}?saved=1`);
}

/** Удаляет Тренера вместе с его Тарифами (каскад в схеме). */
export async function deleteTrainer(fd: FormData): Promise<void> {
  await requireOwner();
  const id = text(fd, "id");
  const trainer = id ? await db.trainer.findUnique({ where: { id } }) : null;
  if (trainer) await db.trainer.deleteMany({ where: { id } });
  revalidateSite();
  redirect(`/admin/trainers?hall=${trainer?.hallId ?? "general"}&deleted=1`);
}

export async function toggleTrainer(fd: FormData): Promise<void> {
  await requireOwner();
  const id = text(fd, "id");
  const trainer = await db.trainer.findUnique({ where: { id } });
  if (trainer) {
    await db.trainer.updateMany({ where: { id }, data: { isVisible: !trainer.isVisible } });
  }
  revalidateSite();
}
