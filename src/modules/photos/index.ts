// Модуль Фото (этап 6, ADR 0015): Фото, Галерея, хранилище файлов. Снаружи — только этот файл (сервер)
// и client.ts (браузер). Базовый модуль: о других модулях не знает. Пока места для Фото Тренера, Зала,
// Направления и Настроек сайта ведёт этот модуль — список чужих таблиц держит tables.test.ts; каждый
// модуль-владелец заберёт своё место в своём PR.
import "server-only";

export * from "./domain/photo";
export { galleryCaptionSchema, parseGalleryCaptionForm, type GalleryCaptionInput } from "./validation/gallery";
export {
  attachPhoto,
  deleteGalleryPhoto,
  discardUpload,
  getGalleryPhoto,
  getSinglePhotos,
  type PhotoSlot,
  type PhotoSlots,
  listGallery,
  moveGalleryPhoto,
  removePhoto,
  requestUpload,
  saveGalleryCaption,
  sweepOrphans,
  toggleGalleryPhoto,
} from "./service/photos";
export {
  MediaFileExists,
  StorageNotConfigured,
  checkSpace,
  disk,
  isStorageConfigured,
  listObjects,
  mediaUrl,
  photoUploaded,
  probeStorage,
  removeObjects,
  storageDriver,
  uploadUrls,
  type StorageDriver,
} from "./storage/client";
export { mediaStatus, photoStorageHealth } from "./storage/status";
