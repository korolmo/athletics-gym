"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { parseGalleryCaptionForm } from "@/lib/validation/gallery";
import * as photos from "@/lib/services/photos";

// Действия — тонкие: права → сервис → обновить страницы. Проверки файла и путей — в сервисе.

export type UploadTicket = { ok: true; path: string; uploadUrl: string } | { ok: false; error: string };
export type PhotoResult = { ok: true } | { ok: false; error: string };

/** Шаг 1: ссылка на загрузку одного файла. Браузер загружает по ней напрямую в хранилище. */
export async function requestUpload(target: string, type: string, size: number): Promise<UploadTicket> {
  await requireOwner();
  return photos.requestUpload(String(target), String(type), Number(size));
}

/** Шаг 2: файл загружен — привязать его к месту на сайте. */
export async function attachPhoto(target: string, path: string): Promise<PhotoResult> {
  await requireOwner();
  const result = await photos.attachPhoto(String(target), String(path));
  if (!result.ok) return result;
  revalidateSite();
  return { ok: true };
}

/** Загрузка сорвалась: убрать файл, если он успел появиться в хранилище. */
export async function discardUpload(path: string): Promise<void> {
  await requireOwner();
  await photos.discardUpload(String(path));
}

export async function removePhoto(fd: FormData): Promise<void> {
  await requireOwner();
  await photos.removePhoto(text(fd, "target"));
  revalidateSite();
}

export async function toggleGalleryPhoto(fd: FormData): Promise<void> {
  await requireOwner();
  await photos.toggleGalleryPhoto(text(fd, "id"));
  revalidateSite();
}

export async function moveGalleryPhoto(fd: FormData): Promise<void> {
  await requireOwner();
  const direction = text(fd, "direction");
  if (direction === "up" || direction === "down") await photos.moveGalleryPhoto(text(fd, "id"), direction);
  revalidateSite();
}

export async function deleteGalleryPhoto(fd: FormData): Promise<void> {
  await requireOwner();
  await photos.deleteGalleryPhoto(text(fd, "id"));
  revalidateSite();
  redirect("/admin/photos?deleted=1#gallery");
}

export type CaptionFormState = { error?: string } | undefined;

export async function saveGalleryCaption(_prev: CaptionFormState, fd: FormData): Promise<CaptionFormState> {
  await requireOwner();
  const parsed = parseGalleryCaptionForm(fd);
  if (!parsed.ok) return { error: parsed.error };
  const result = await photos.saveGalleryCaption(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidateSite();
  redirect("/admin/photos?saved=1#gallery");
}
