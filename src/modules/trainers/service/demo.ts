import "server-only";
import { db } from "@/lib/db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

// Загруженный Плакат (uploadedPhoto) Гость не меняет — снимок его не трогает
const FIELDS = { id: true, name: true, hallId: true, photo: true, descriptionRu: true, descriptionKk: true, sortOrder: true, isVisible: true } as const;
type Row = { id: string } & Record<string, unknown>;

export async function demoSnapshot(): Promise<Row[]> {
  return db.trainer.findMany({ select: FIELDS });
}

/** Тренеры по id — как в снимке; созданные Гостем — удаляются вместе со своими Тарифами и часами. */
export async function demoRestore(rows: Row[]): Promise<void> {
  await db.trainer.deleteMany({ where: { id: { notIn: rows.map((r) => r.id) } } });
  for (const { id, ...data } of rows) await db.trainer.updateMany({ where: { id }, data });
}
