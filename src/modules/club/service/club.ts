import "server-only";
import { db } from "@/lib/db";
import { CLUB_FIELDS, CLUB_ID, DEFAULT_CLUB, type ClubData } from "../domain/club";

/** Клуб — для сайта, кабинета и админки, без проверки сессии. Строку заводит миграция; нет — начальные значения. */
export async function getClub(): Promise<ClubData> {
  return (await db.club.findUnique({ where: { id: CLUB_ID }, select: CLUB_FIELDS })) ?? DEFAULT_CLUB;
}
