import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { CLUB_FIELDS, DEFAULT_CLUB, type ClubData } from "../domain/club";

/** Клуб — для сайта, кабинета и админки, без проверки сессии. Строку заводит миграция; нет — начальные значения. */
export async function getClub(clubId: string): Promise<ClubData> {
  return (await dbFor(clubId).club.findUnique({ where: { id: clubId }, select: CLUB_FIELDS })) ?? DEFAULT_CLUB;
}
