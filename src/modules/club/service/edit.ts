import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/modules/owner";
import { CLUB_FIELDS, CLUB_ID, DEFAULT_CLUB, type ClubData } from "../domain/club";
import { logoSource } from "../domain/logo";
import type { ClubInput } from "../validation/club";

// Форма «Клуб» раздела «Сайт» (этап П1, решение 13): чтение и сохранение — только Владельцу.

export async function getClubForEdit(): Promise<ClubData> {
  await requireOwner();
  return (await db.club.findUnique({ where: { id: CLUB_ID }, select: CLUB_FIELDS })) ?? DEFAULT_CLUB;
}

/**
 * Сохранить Клуб. Логотип: «file» — исходный файл, «monogram» — пусто (монограмма), «photo» — загруженное Фото
 * остаётся как было (Фото загружается и удаляется своим местом «logo», не этой формой). Строки нет — создаём.
 */
export async function saveClub(input: ClubInput): Promise<void> {
  await requireOwner();
  const current = await db.club.findUnique({ where: { id: CLUB_ID }, select: { logo: true } });
  const { logoMode, ...fields } = input;
  const logo =
    logoMode === "file" ? DEFAULT_CLUB.logo : logoMode === "monogram" ? null : logoSource(current?.logo).kind === "photo" ? current!.logo : (current?.logo ?? null);
  const data = { ...fields, logo };
  await db.club.upsert({ where: { id: CLUB_ID }, update: data, create: { ...DEFAULT_CLUB, ...data, id: CLUB_ID } });
}

// ——— Логотип-Фото: для места «logo» модуля Фото (его собирает слой приложения, src/app/admin/photos/slots.ts) ———

/** Путь загруженного логотипа или null (файл и монограмма — не Фото). */
export async function readLogoPhoto(): Promise<string | null> {
  const row = await db.club.findUnique({ where: { id: CLUB_ID }, select: { logo: true } });
  return logoSource(row?.logo).kind === "photo" ? row!.logo : null;
}

/** Поставить загруженное Фото логотипом; вернуть прежнее Фото (его файл уберёт модуль Фото). */
export async function setLogoPhoto(path: string): Promise<string | null> {
  const previous = await readLogoPhoto();
  await db.club.update({ where: { id: CLUB_ID }, data: { logo: path } });
  return previous;
}

/** Убрать загруженное Фото: логотипом станет монограмма. Вернуть убранное Фото. */
export async function clearLogoPhoto(): Promise<string | null> {
  const previous = await readLogoPhoto();
  if (previous) await db.club.update({ where: { id: CLUB_ID }, data: { logo: null } });
  return previous;
}
