import "server-only";
import type { PhotoSlots } from "@/modules/photos";
import { pricePosterSlot } from "@/modules/tariffs";
import { trainerPosterSlot } from "@/modules/trainers";
import { directionPhotoSlot } from "@/modules/directions";
import { heroPhotoSlot, womenPhotoSlot } from "@/modules/site";
import { clearLogoPhoto, readLogoPhoto, setLogoPhoto } from "@/modules/club";

/** Логотип Клуба (этап П1): Клуб — базовый модуль и о Фото не знает, поэтому его место собирается здесь. */
const logoPhotoSlot: PhotoSlots[number] = {
  kind: "logo",
  exists: async (id) => id === undefined,
  set: async (_id, path) => setLogoPhoto(path),
  clear: async () => clearLogoPhoto(),
  paths: async () => [await readLogoPhoto()],
};

/**
 * Места для Фото, которые ведут модули-владельцы (этап 6, ADR 0015, «Места для Фото»). Фото о владельцах
 * не знает — их места собирает слой приложения и передаёт сервису Фото. Новый модуль-владелец добавляет
 * своё место сюда; без него загрузка в это место не принимается, а уборка файлов пропускается.
 */
export const photoSlots: PhotoSlots = [pricePosterSlot, trainerPosterSlot, directionPhotoSlot, heroPhotoSlot, womenPhotoSlot, logoPhotoSlot];
