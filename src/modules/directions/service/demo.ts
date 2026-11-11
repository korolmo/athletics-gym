import "server-only";
import { db } from "@/lib/db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

// Своё Фото Направления Гость не загружает — снимок его не трогает
const FIELDS = { id: true, titleRu: true, titleKk: true, descriptionRu: true, descriptionKk: true, icon: true, isVisible: true, sortOrder: true } as const;
type Row = { id: string } & Record<string, unknown>;

export async function demoSnapshot(): Promise<Row[]> {
  return db.direction.findMany({ select: FIELDS });
}

export async function demoRestore(rows: Row[]): Promise<void> {
  await db.direction.deleteMany({ where: { id: { notIn: rows.map((r) => r.id) } } });
  for (const { id, ...data } of rows) await db.direction.updateMany({ where: { id }, data });
}
