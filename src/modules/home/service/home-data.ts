import "server-only";
import { listVisibleGallery } from "@/modules/photos";
import { getSettingsPhotoUrls } from "@/modules/site";
import { listPricePosterUrls, listVisibleHallTariffs } from "@/modules/tariffs";
import { listVisibleTrainersWithTariffs } from "@/modules/trainers";

// Данные главной (этап 6, ADR 0015): модуль поверх остальных собирает то, что Владелец оставил видимым, —
// через публичные функции модулей-владельцев, в чужие таблицы не ходит. Без проверки сессии.

/** Позиции прайса Залов и Тренеры с их персональными Тарифами. */
export async function getPriceListAndTrainers() {
  const [hallTariffs, trainers] = await Promise.all([listVisibleHallTariffs(), listVisibleTrainersWithTariffs()]);
  return { hallTariffs, trainers };
}

/**
 * Фото, загруженные Владельцем, — готовыми ссылками. Пусто (null) значит «не загружено»:
 * секция показывает картинку из public/, как до этапа 2.
 */
export async function getSitePhotos() {
  const [{ hero, women }, posters, gallery] = await Promise.all([getSettingsPhotoUrls(), listPricePosterUrls(), listVisibleGallery()]);
  return { hero, women, posters, gallery };
}
