import "server-only";
import { dbFor } from "@/lib/tenant-db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

import { CLUB_FIELDS, DEFAULT_CLUB, type ClubData } from "../domain/club";

export async function demoSnapshot(clubId: string): Promise<ClubData> {
  return (await dbFor(clubId).club.findUnique({ where: { id: clubId }, select: CLUB_FIELDS })) ?? DEFAULT_CLUB;
}

export async function demoRestore(clubId: string, data: ClubData): Promise<void> {
  await dbFor(clubId).club.upsert({ where: { id: clubId }, update: data, create: { ...data, id: clubId } });
}
