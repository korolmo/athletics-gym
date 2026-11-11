import "server-only";
import { db } from "@/lib/db";
// Суточный сброс демо-админки Лаборатории (этап П1, ADR 0019): снимок того, что может менять Гость, и возврат к нему.
// Своё делает сам модуль — его таблицы никто, кроме него, не трогает; собирает всё модуль demo.

import { SETTINGS_ID } from "./settings";

// Фото первого экрана и Женского зала Гость не загружает — их снимок не трогает (загрузки Владельца остаются)
type SettingsRow = Record<string, unknown>;
type Snapshot = { settings: SettingsRow | null; cards: { position: number; [k: string]: unknown }[] };

export async function demoSnapshot(): Promise<Snapshot> {
  const [row, cards] = await Promise.all([db.siteSettings.findUnique({ where: { id: SETTINGS_ID } }), db.aboutCard.findMany({ orderBy: { position: "asc" } })]);
  if (!row) return { settings: null, cards };
  const settings: SettingsRow = { ...row };
  for (const key of ["id", "heroPhoto", "womenPhoto"]) delete settings[key];
  return { settings, cards };
}

export async function demoRestore(s: Snapshot): Promise<void> {
  if (s.settings) await db.siteSettings.update({ where: { id: SETTINGS_ID }, data: s.settings });
  for (const { position, ...card } of s.cards) await db.aboutCard.update({ where: { position }, data: card });
}
