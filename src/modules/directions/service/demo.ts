import "server-only";
import { dbFor } from "@/lib/tenant-db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

// Своё Фото Направления Гость не загружает — снимок его не трогает
const FIELDS = { id: true, titleRu: true, titleKk: true, descriptionRu: true, descriptionKk: true, icon: true, isVisible: true, sortOrder: true } as const;
type Row = { id: string } & Record<string, unknown>;

export async function demoSnapshot(clubId: string): Promise<Row[]> {
  return dbFor(clubId).direction.findMany({ select: FIELDS });
}

export async function demoRestore(clubId: string, rows: Row[]): Promise<void> {
  await dbFor(clubId).direction.deleteMany({ where: { id: { notIn: rows.map((r) => r.id) } } });
  for (const { id, ...data } of rows) await dbFor(clubId).direction.updateMany({ where: { id }, data });
}
