import "server-only";
import { db } from "@/lib/db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

// Галерея: Гость меняет порядок, показ и подписи; Фото, загруженные Владельцем после снимка, не трогаем
type Row = { id: string; captionRu: string | null; captionKk: string | null; isVisible: boolean; sortOrder: number };

export async function demoSnapshot(): Promise<Row[]> {
  return db.galleryPhoto.findMany({ select: { id: true, captionRu: true, captionKk: true, isVisible: true, sortOrder: true } });
}

export async function demoRestore(rows: Row[]): Promise<void> {
  for (const { id, ...data } of rows) await db.galleryPhoto.updateMany({ where: { id }, data });
}
