// Как Блоки главной и формы Настроек сайта называются в админке (она только на русском).
import type { BlockId, SettingsFormId } from "@/lib/domain/site-settings";

export const BLOCK_LABEL_RU: Record<BlockId, string> = {
  marquee: "Бегущая строка",
  about: "О зале",
  directions: "С чем помогут тренеры",
  women: "Женский зал",
  prices: "Цены",
  gallery: "Галерея",
  trainers: "Тренеры",
  reviews: "Отзывы",
  contacts: "Контакты",
};

export const SETTINGS_FORM_LABEL_RU: Record<SettingsFormId, string> = {
  hero: "Первый экран",
  marquee: BLOCK_LABEL_RU.marquee,
  about: BLOCK_LABEL_RU.about,
  women: BLOCK_LABEL_RU.women,
  contacts: BLOCK_LABEL_RU.contacts,
  rating: "Рейтинг 2ГИС",
  legal: "Реквизиты",
};
