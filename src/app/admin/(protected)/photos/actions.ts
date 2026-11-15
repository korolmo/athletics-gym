"use server";

import { redirect } from "next/navigation";
import { requireOwner, requireRealOwner } from "@/modules/owner";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/app/admin/revalidate";
import { parseGalleryCaptionForm } from "@/modules/photos";
import * as photos from "@/modules/photos";
import { currentClub } from "@/app/current-club";
import { photoSlots } from "./slots";

// Действия — тонкие: права → сервис → обновить страницы. Проверки файла и путей — в сервисе.

export type UploadTicket = { ok: true; path: string; uploads: { path: string; url: string }[] } | { ok: false; error: string };
export type PhotoResult = { ok: true } | { ok: false; error: string };

/** Шаг 1: адреса загрузки Фото и его уменьшенных копий. Браузер загружает по ним файлы (PUT). */
export async function requestUpload(target: string, type: string, sizes: number[]): Promise<UploadTicket> {
  await requireRealOwner();
  const clubId = await currentClub();
  return photos.requestUpload(clubId, String(target), String(type), Array.isArray(sizes) ? sizes.map(Number) : [], photoSlots(clubId));
}

/** Шаг 2: файл загружен — привязать его к месту на сайте. */
export async function attachPhoto(target: string, path: string): Promise<PhotoResult> {
  await requireRealOwner();
  const clubId = await currentClub();
  const result = await photos.attachPhoto(clubId, String(target), String(path), photoSlots(clubId));
  if (!result.ok) return result;
  revalidateSite();
  return { ok: true };
}

/** Загрузка сорвалась: убрать файл, если он успел появиться в хранилище. */
export async function discardUpload(path: string): Promise<void> {
  await requireRealOwner();
  const clubId = await currentClub();
  await photos.discardUpload(clubId, String(path), photoSlots(clubId));
}

export async function removePhoto(fd: FormData): Promise<void> {
  await requireRealOwner();
  const clubId = await currentClub();
  await photos.removePhoto(clubId, text(fd, "target"), photoSlots(clubId));
  revalidateSite();
}

export async function toggleGalleryPhoto(fd: FormData): Promise<void> {
  await requireOwner();
  const clubId = await currentClub();
  await photos.toggleGalleryPhoto(clubId, text(fd, "id"));
  revalidateSite();
}

export async function moveGalleryPhoto(fd: FormData): Promise<void> {
  await requireOwner();
  const clubId = await currentClub();
  const direction = text(fd, "direction");
  if (direction === "up" || direction === "down") await photos.moveGalleryPhoto(clubId, text(fd, "id"), direction);
  revalidateSite();
}

export async function deleteGalleryPhoto(fd: FormData): Promise<void> {
  await requireRealOwner();
  const clubId = await currentClub();
  await photos.deleteGalleryPhoto(clubId, text(fd, "id"));
  revalidateSite();
  redirect("/admin/photos?deleted=1#gallery");
}

export type CaptionFormState = { error?: string } | undefined;

export async function saveGalleryCaption(_prev: CaptionFormState, fd: FormData): Promise<CaptionFormState> {
  await requireOwner();
  const clubId = await currentClub();
  const parsed = parseGalleryCaptionForm(fd);
  if (!parsed.ok) return { error: parsed.error };
  const result = await photos.saveGalleryCaption(clubId, parsed.data);
  if (!result.ok) return { error: result.error };
  revalidateSite();
  redirect("/admin/photos?saved=1#gallery");
}
