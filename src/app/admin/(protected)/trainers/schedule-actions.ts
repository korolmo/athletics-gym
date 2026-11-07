"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/modules/owner";
import { text } from "@/lib/admin/form";
import { addTimeOff, deleteTimeOff, parseTimeOff, parseWorkWeek, saveWorkWeek } from "@/modules/schedule";

// Часы работы и исключения Тренера (этап 1). Свободные Окна на кэшированную главную не попадают —
// revalidateSite не нужен, обновляем только страницу Тренера в админке.

export type ScheduleFormState = { ok?: boolean; error?: string } | undefined;

export async function saveWorkWeekAction(_prev: ScheduleFormState, fd: FormData): Promise<ScheduleFormState> {
  await requireOwner();
  const trainerId = text(fd, "trainerId");
  const parsed = parseWorkWeek(fd);
  if (!parsed.ok) return { error: parsed.error };
  const r = await saveWorkWeek(trainerId, parsed.data);
  if (!r.ok) return { error: r.error };
  revalidatePath(`/admin/trainers/${trainerId}`);
  return { ok: true };
}

export async function addTimeOffAction(_prev: ScheduleFormState, fd: FormData): Promise<ScheduleFormState> {
  await requireOwner();
  const trainerId = text(fd, "trainerId");
  const parsed = parseTimeOff(fd);
  if (!parsed.ok) return { error: parsed.error };
  const r = await addTimeOff(trainerId, parsed.data);
  if (!r.ok) return { error: r.error };
  revalidatePath(`/admin/trainers/${trainerId}`);
  return { ok: true };
}

export async function deleteTimeOffAction(fd: FormData): Promise<void> {
  await requireOwner();
  await deleteTimeOff(text(fd, "id"));
  revalidatePath(`/admin/trainers/${text(fd, "trainerId")}`);
}
