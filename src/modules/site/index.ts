// Модуль Сайт (этап 6, ADR 0015): Настройки сайта, Блоки, Реквизиты, карточки «О зале», рейтинг 2ГИС и места
// для Фото первого экрана и Женского зала. Снаружи — этот файл (сервер) и client.ts (браузер и чистый код).
// Зависит от Фото и Аккаунта Владельца; Главная и Юридические документы берут у него Настройки.
import "server-only";

export * from "./client";
export * from "./validation/site-settings";
export { SETTINGS_ID, getSiteSettings } from "./service/settings";
export {
  getSettingsForEdit,
  saveAbout,
  saveContacts,
  saveHero,
  saveLegal,
  saveMarquee,
  saveRating,
  saveWomen,
  toggleBlock,
} from "./service/site-settings";
export { getSettingsPhotos, heroPhotoSlot, womenPhotoSlot } from "./service/photo-slots";
export { getSettingsPhotoUrls } from "./service/public-photos";
