import "server-only";
import { db } from "@/lib/db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

import { CLUB_FIELDS, CLUB_ID, DEFAULT_CLUB, type ClubData } from "../domain/club";

export async function demoSnapshot(): Promise<ClubData> {
  return (await db.club.findUnique({ where: { id: CLUB_ID }, select: CLUB_FIELDS })) ?? DEFAULT_CLUB;
}

export async function demoRestore(data: ClubData): Promise<void> {
  await db.club.upsert({ where: { id: CLUB_ID }, update: data, create: { ...data, id: CLUB_ID } });
}
