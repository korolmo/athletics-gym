"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { isHall } from "@/lib/tariffs";

export type TrainerFormState = { error?: string } | undefined;

async function requireOwner() {
  if (!(await isAuthed())) redirect("/admin/login");
}

function revalidateSite() {
  revalidatePath("/ru");
  revalidatePath("/kk");
  revalidatePath("/admin/trainers");
  revalidatePath("/admin/tariffs");
}

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function saveTrainer(_prev: TrainerFormState, fd: FormData): Promise<TrainerFormState> {
  await requireOwner();

  const id = text(fd, "id");
  const name = text(fd, "name");
  const hallId = text(fd, "hallId");
  const rawOrder = text(fd, "sortOrder");

  if (!name) return { error: "Заполните имя" };
  if (!isHall(hallId)) return { error: "Выберите зал" };
  const sortOrder = rawOrder === "" ? null : Number(rawOrder);
  if (sortOrder !== null && (!Number.isInteger(sortOrder) || sortOrder < 0)) {
    return { error: "Порядок — целое число от 0" };
  }

  const data = {
    name,
    hallId,
    descriptionRu: text(fd, "descriptionRu") || null,
    descriptionKk: text(fd, "descriptionKk") || null,
    isVisible: fd.get("isVisible") === "on",
  };

  let savedId = id;
  if (id) {
    // Тарифы Тренера переезжают в его Зал вместе с ним
    await db.$transaction([
      db.trainer.update({ where: { id }, data: { ...data, sortOrder: sortOrder ?? 0 } }),
      db.tariff.updateMany({ where: { trainerId: id }, data: { hallId } }),
    ]);
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
  if (trainer) await db.trainer.delete({ where: { id } });
  revalidateSite();
  redirect(`/admin/trainers?hall=${trainer?.hallId ?? "general"}&deleted=1`);
}

export async function toggleTrainer(fd: FormData): Promise<void> {
  await requireOwner();
  const id = text(fd, "id");
  const trainer = await db.trainer.findUnique({ where: { id } });
  if (trainer) {
    await db.trainer.update({ where: { id }, data: { isVisible: !trainer.isVisible } });
  }
  revalidateSite();
}
