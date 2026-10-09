"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { isOwnerStatus } from "@/lib/domain/review";
import { parseOwnerReviewForm } from "@/lib/validation/review";
import * as reviews from "@/lib/services/reviews";

// Действия — тонкие: права → валидация → сервис → обновить страницы

/** При ошибке возвращаем введённое: набранный с телефона текст отзыва терять нельзя. */
export type ReviewFormState = { error: string; values: Record<string, string> } | undefined;

export async function saveReview(_prev: ReviewFormState, fd: FormData): Promise<ReviewFormState> {
  await requireOwner();
  const values = Object.fromEntries([...fd].filter((e): e is [string, string] => typeof e[1] === "string"));
  const parsed = parseOwnerReviewForm(fd);
  if (!parsed.ok) return { error: parsed.error, values };

  const result = await reviews.saveOwnerReview(parsed.data);
  if (!result.ok) return { error: result.error, values };

  revalidateSite();
  redirect("/admin/reviews?saved=1");
}

/** «Опубликовать» и «Скрыть» — из списка и со страницы Отзыва. */
export async function setReviewStatus(fd: FormData): Promise<void> {
  await requireOwner();
  const status = text(fd, "status");
  if (isOwnerStatus(status)) await reviews.setReviewStatus(text(fd, "id"), status);
  revalidateSite();
}

export async function deleteReview(fd: FormData): Promise<void> {
  await requireOwner();
  await reviews.deleteReview(text(fd, "id"));
  revalidateSite();
  redirect("/admin/reviews?deleted=1");
}
