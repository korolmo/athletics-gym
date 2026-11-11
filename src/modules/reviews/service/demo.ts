import "server-only";
import { db } from "@/lib/db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

import type { ReviewStatus } from "@prisma/client";

// Гость меняет только Статус Отзыва; новые Отзывы Посетителей после снимка — настоящие данные, их не трогаем
type Row = { id: string; status: ReviewStatus };

export async function demoSnapshot(): Promise<Row[]> {
  return db.review.findMany({ select: { id: true, status: true } });
}

export async function demoRestore(rows: Row[]): Promise<void> {
  for (const { id, status } of rows) await db.review.updateMany({ where: { id }, data: { status } });
}
