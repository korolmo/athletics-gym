import "server-only";
import { dbFor } from "@/lib/tenant-db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.


// Фото первого экрана и Женского зала Гость не загружает — их снимок не трогает (загрузки Владельца остаются)
type SettingsRow = Record<string, unknown>;
type Snapshot = { settings: SettingsRow | null; cards: { position: number; [k: string]: unknown }[] };

export async function demoSnapshot(clubId: string): Promise<Snapshot> {
  const [row, cards] = await Promise.all([dbFor(clubId).siteSettings.findUnique({ where: { clubId } }), dbFor(clubId).aboutCard.findMany({ orderBy: { position: "asc" } })]);
  if (!row) return { settings: null, cards };
  const settings: SettingsRow = { ...row };
  for (const key of ["id", "clubId", "heroPhoto", "womenPhoto"]) delete settings[key];
  return { settings, cards };
}

export async function demoRestore(clubId: string, s: Snapshot): Promise<void> {
  if (s.settings) await dbFor(clubId).siteSettings.update({ where: { clubId }, data: s.settings });
  for (const { position, ...card } of s.cards) {
    // Клуб строки не меняется: в снимке его может не быть (снимки до П2) или он тот же
    delete card.clubId;
    await dbFor(clubId).aboutCard.update({ where: { clubId_position: { clubId, position } }, data: card });
  }
}
