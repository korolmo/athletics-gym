"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { parseDirectionForm } from "@/lib/validation/direction";
import * as directions from "@/lib/services/directions";

// Действия — тонкие: права → валидация → сервис → обновить страницы

/** При ошибке возвращаем введённое, чтобы набранный с телефона текст не пропал. */
export type DirectionFormState = { error: string; values: Record<string, string> } | undefined;

export async function saveDirection(_prev: DirectionFormState, fd: FormData): Promise<DirectionFormState> {
  await requireOwner();
  const values = Object.fromEntries([...fd].filter((e): e is [string, string] => typeof e[1] === "string"));
  const parsed = parseDirectionForm(fd);
  if (!parsed.ok) return { error: parsed.error, values };

  const result = await directions.saveDirection(parsed.data);
  if (!result.ok) return { error: result.error, values };

  revalidateSite();
  // Новое Направление открываем сразу: там же загружается своё фото
  redirect(parsed.data.id ? "/admin/directions?saved=1" : `/admin/directions/${result.id}?created=1`);
}

export async function toggleDirection(fd: FormData): Promise<void> {
  await requireOwner();
  await directions.toggleDirection(text(fd, "id"));
  revalidateSite();
}

export async function moveDirection(fd: FormData): Promise<void> {
  await requireOwner();
  const direction = text(fd, "direction");
  if (direction === "up" || direction === "down") await directions.moveDirection(text(fd, "id"), direction);
  revalidateSite();
}

export async function deleteDirection(fd: FormData): Promise<void> {
  await requireOwner();
  await directions.deleteDirection(text(fd, "id"));
  revalidateSite();
  redirect("/admin/directions?deleted=1");
}
