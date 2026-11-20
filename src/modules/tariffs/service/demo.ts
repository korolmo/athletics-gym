import "server-only";
import { dbFor } from "@/lib/tenant-db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

const FIELDS = { id: true, hallId: true, trainerId: true, category: true, titleRu: true, titleKk: true, visitsPerMonth: true, durationMonths: true, access: true, audience: true, price: true, priceTo: true, isVisible: true, sortOrder: true } as const;
type Row = { id: string } & Record<string, unknown>;

export async function demoSnapshot(clubId: string): Promise<Row[]> {
  return dbFor(clubId).tariff.findMany({ select: FIELDS });
}

/** Тарифы по id — как в снимке; созданные после снимка — удаляются. Запускать после Тренеров. */
export async function demoRestore(clubId: string, rows: Row[]): Promise<void> {
  const ids = rows.map((r) => r.id);
  await dbFor(clubId).tariff.deleteMany({ where: { id: { notIn: ids } } });
  for (const { id, ...data } of rows) await dbFor(clubId).tariff.updateMany({ where: { id }, data });
}
