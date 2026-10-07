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
  const sortOrder = Number(text(fd, "sortOrder") || "0");

  if (!id) return { error: "Тренер не найден" };
  if (!name) return { error: "Заполните имя" };
  if (!isHall(hallId)) return { error: "Выберите зал" };
  if (!Number.isInteger(sortOrder) || sortOrder < 0) return { error: "Порядок — целое число от 0" };

  // Тарифы Тренера переезжают в его Зал вместе с ним
  await db.$transaction([
    db.trainer.update({
      where: { id },
      data: {
        name,
        hallId,
        descriptionRu: text(fd, "descriptionRu") || null,
        descriptionKk: text(fd, "descriptionKk") || null,
        sortOrder,
        isVisible: fd.get("isVisible") === "on",
      },
    }),
    db.tariff.updateMany({ where: { trainerId: id }, data: { hallId } }),
  ]);

  revalidateSite();
  redirect(`/admin/trainers/${id}?saved=1`);
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
