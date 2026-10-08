"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { parseTrainerForm } from "@/lib/validation/trainer";
import * as trainers from "@/lib/services/trainers";

// Действия — тонкие: права → валидация → сервис → обновить страницы и вернуть Владельца в список

export type TrainerFormState = { error?: string } | undefined;

export async function saveTrainer(_prev: TrainerFormState, fd: FormData): Promise<TrainerFormState> {
  await requireOwner();
  const parsed = parseTrainerForm(fd);
  if (!parsed.ok) return { error: parsed.error };

  const result = await trainers.saveTrainer(parsed.data);
  if (!result.ok) return { error: result.error };

  revalidateSite();
  redirect(`/admin/trainers/${result.id}?saved=1`);
}

export async function deleteTrainer(fd: FormData): Promise<void> {
  await requireOwner();
  const place = await trainers.deleteTrainer(text(fd, "id"));
  revalidateSite();
  redirect(`/admin/trainers?hall=${place?.hallId ?? "general"}&deleted=1`);
}

export async function toggleTrainer(fd: FormData): Promise<void> {
  await requireOwner();
  await trainers.toggleTrainerVisibility(text(fd, "id"));
  revalidateSite();
}
