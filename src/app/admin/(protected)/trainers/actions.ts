"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import { parseTrainerForm } from "@/lib/validation/trainer";

export type TrainerFormState = { error?: string } | undefined;

export async function saveTrainer(_prev: TrainerFormState, fd: FormData): Promise<TrainerFormState> {
  await requireOwner();

  const parsed = parseTrainerForm(fd);
  if (!parsed.ok) return { error: parsed.error };
  const { id, sortOrder, ...data } = parsed.data;

  let savedId = id;
  if (id) {
    // Тарифы Тренера переезжают в его Зал вместе с ним
    try {
      await db.$transaction([
        db.trainer.update({ where: { id }, data: { ...data, sortOrder: sortOrder ?? 0 } }),
        db.tariff.updateMany({ where: { trainerId: id }, data: { hallId: data.hallId } }),
      ]);
    } catch (e) {
      // Тренера могли удалить в другой вкладке — сообщаем, а не падаем с ошибкой сервера
      if (isNotFound(e)) return { error: NOT_FOUND_MESSAGE };
      throw e;
    }
  } else {
    // Новый Тренер встаёт в конец списка своего Зала; фото загрузим на этапе 2
    const last = await db.trainer.aggregate({ where: { hallId: data.hallId }, _max: { sortOrder: true } });
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
