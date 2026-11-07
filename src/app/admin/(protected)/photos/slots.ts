import "server-only";
import type { PhotoSlots } from "@/modules/photos";
import { pricePosterSlot } from "@/modules/tariffs";

/**
 * Места для Фото, которые ведут модули-владельцы (этап 6, ADR 0015, «Места для Фото»). Фото о владельцах
 * не знает — их места собирает слой приложения и передаёт сервису Фото. Новый модуль-владелец добавляет
 * своё место сюда; без него загрузка в это место не принимается, а уборка файлов пропускается.
 */
export const photoSlots: PhotoSlots = [pricePosterSlot];
