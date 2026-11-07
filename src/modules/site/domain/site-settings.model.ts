// Модель Настроек сайта: Блоки, колонки показа и типы записей — без импортов. Её берут и правила
// (site-settings.ts), и начальные значения (site-settings.defaults.ts): так между ними нет цикла (этап 6).

/** Блоки главной, которые Владелец может скрыть, — в порядке страницы. Первый экран не скрывается и Блоком не считается. */
export const BLOCKS = ["marquee", "about", "directions", "women", "prices", "gallery", "trainers", "reviews", "contacts"] as const;
export type BlockId = (typeof BLOCKS)[number];

export function isBlock(value: string): value is BlockId {
  return (BLOCKS as readonly string[]).includes(value);
}

/** Колонка «показывать на сайте» для каждого Блока. */
export const SHOW_COLUMN = {
  marquee: "showMarquee",
  about: "showAbout",
  directions: "showDirections",
  women: "showWomen",
  prices: "showPrices",
  gallery: "showGallery",
  trainers: "showTrainers",
  reviews: "showReviews",
  contacts: "showContacts",
} as const satisfies Record<BlockId, string>;

/** Формы раздела «Сайт»: что из Настроек Владелец правит вместе. */
export const SETTINGS_FORMS = ["hero", "marquee", "about", "women", "contacts", "rating", "legal"] as const;
export type SettingsFormId = (typeof SETTINGS_FORMS)[number];

export function isSettingsForm(value: string): value is SettingsFormId {
  return (SETTINGS_FORMS as readonly string[]).includes(value);
}

/** Карточек «О зале» всегда четыре: место задаёт иконку и порядок. */
export const ABOUT_CARD_COUNT = 4;

/** Настройки сайта, как они лежат в базе (без служебных полей). */
export type SiteSettingsData = {
  heroTitleRu: string;
  heroTitleKk: string | null;
  heroSubtitleRu: string;
  heroSubtitleKk: string | null;
  womenTextRu: string;
  womenTextKk: string | null;
  womenInstagram: string;
  addressRu: string;
  addressKk: string | null;
  hoursRu: string;
  hoursKk: string | null;
  phone: string;
  whatsapp: string;
  instagram: string;
  ratingTenths: number;
  ratingCount: number;
  /** Реквизиты: все необязательны */
  legalName: string | null;
  /** ИИН/БИН: ровно 12 цифр */
  legalBin: string | null;
  legalAddress: string | null;
  /** Email для обращений о персональных данных */
  privacyEmail: string | null;
  /** Место хранения данных: продолжение фразы «Данные хранятся …»; пусто — текст по умолчанию */
  dataLocationRu: string | null;
  dataLocationKk: string | null;
  /** Пункты бегущей строки; списки одной длины, пустая строка в казахском — «как на русском» */
  marqueeRu: string[];
  marqueeKk: string[];
} & Record<(typeof SHOW_COLUMN)[BlockId], boolean>;

export type AboutCardData = {
  position: number;
  kickerRu: string;
  kickerKk: string | null;
  titleRu: string;
  titleKk: string | null;
  textRu: string;
  textKk: string | null;
};
