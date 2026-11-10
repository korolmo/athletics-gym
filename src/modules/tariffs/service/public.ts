import "server-only";
import { db } from "@/lib/db";
import { mediaUrl } from "@/modules/photos";

// Тарифы для публичного сайта: только видимое, без проверки сессии. Собирает их модуль Главная (ADR 0015).

const byOrder = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

/** Видимые позиции прайса Залов (без персональных Тарифов Тренеров — те приходят с Тренерами). */
export async function listVisibleHallTariffs() {
  return db.tariff.findMany({ where: { isVisible: true, trainerId: null }, orderBy: byOrder });
}

/** Плакаты прайса по Залам — ссылками; null — не загружен, секция покажет картинку из public/. */
export async function listPricePosterUrls(): Promise<Record<string, string | null>> {
  const halls = await db.hall.findMany({ select: { id: true, pricePoster: true } });
  return Object.fromEntries(halls.map((h) => [h.id, mediaUrl(h.pricePoster)]));
}

/** Логотипы Залов как есть в базе (этап П1, решение 16): «/…», путь к Фото или null — тогда логотип Клуба. */
export async function listHallLogos(): Promise<Record<string, string | null>> {
  const halls = await db.hall.findMany({ select: { id: true, logo: true } });
  return Object.fromEntries(halls.map((h) => [h.id, h.logo]));
}
