// Настройки сайта: модель и правила — чистые функции, без базы и запроса.

import { pick, type Locale } from "@/lib/i18n";
import { DEFAULT_SETTINGS } from "./site-settings.defaults";

/** Блоки главной, которые Владелец может скрыть, — в порядке страницы. Первый экран не скрывается и Блоком не считается. */
export const BLOCKS = ["about", "directions", "women", "prices", "gallery", "trainers", "contacts"] as const;
export type BlockId = (typeof BLOCKS)[number];

export function isBlock(value: string): value is BlockId {
  return (BLOCKS as readonly string[]).includes(value);
}

/** Колонка «показывать на сайте» для каждого Блока. */
export const SHOW_COLUMN = {
  about: "showAbout",
  directions: "showDirections",
  women: "showWomen",
  prices: "showPrices",
  gallery: "showGallery",
  trainers: "showTrainers",
  contacts: "showContacts",
} as const satisfies Record<BlockId, string>;

/** Формы раздела «Сайт»: что из Настроек Владелец правит вместе. */
export const SETTINGS_FORMS = ["hero", "about", "women", "contacts", "rating"] as const;
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

/** Настройки сайта на языке страницы — то, что получают секции главной. */
export type SiteContent = {
  hero: { title: string; subtitle: string };
  /** Четыре карточки «О зале» по порядку */
  about: { kicker: string; title: string; text: string }[];
  women: { text: string; instagram: string };
  contacts: {
    address: string;
    hours: string;
    /** Для ссылки tel: */
    phoneTel: string;
    /** Для показа: +7 771 484 63 44 */
    phoneDisplay: string;
    /** Номер WhatsApp для ссылок wa.me — только цифры */
    whatsapp: string;
    whatsappDisplay: string;
    instagram: string;
  };
  rating: { value: string; count: number };
  show: Record<BlockId, boolean>;
};

/**
 * Вторая линия защиты: в ссылки сайта (href) попадает только то, что проходит те же правила, что и форма.
 * Если в базе оказалось что-то другое (правили мимо админки) — берём начальное значение, а не подставляем как есть.
 */
function safeInstagram(url: string, fallback: string): string {
  return isInstagramUrl(url) ? url : fallback;
}

export function toSiteContent(locale: Locale, s: SiteSettingsData, cards: AboutCardData[]): SiteContent {
  const phone = isPhone(s.phone) ? s.phone : DEFAULT_SETTINGS.phone;
  const whatsapp = isPhone(`+${s.whatsapp}`) ? s.whatsapp : DEFAULT_SETTINGS.whatsapp;
  return {
    hero: {
      title: pick(locale, s.heroTitleRu, s.heroTitleKk),
      subtitle: pick(locale, s.heroSubtitleRu, s.heroSubtitleKk),
    },
    about: [...cards]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        kicker: pick(locale, c.kickerRu, c.kickerKk),
        title: pick(locale, c.titleRu, c.titleKk),
        text: pick(locale, c.textRu, c.textKk),
      })),
    women: {
      text: pick(locale, s.womenTextRu, s.womenTextKk),
      instagram: safeInstagram(s.womenInstagram, DEFAULT_SETTINGS.womenInstagram),
    },
    contacts: {
      address: pick(locale, s.addressRu, s.addressKk),
      hours: pick(locale, s.hoursRu, s.hoursKk),
      phoneTel: phone,
      phoneDisplay: formatPhone(phone),
      whatsapp,
      whatsappDisplay: formatPhone(`+${whatsapp}`),
      instagram: safeInstagram(s.instagram, DEFAULT_SETTINGS.instagram),
    },
    rating: { value: formatRating(s.ratingTenths), count: s.ratingCount },
    show: Object.fromEntries(BLOCKS.map((b) => [b, s[SHOW_COLUMN[b]]])) as Record<BlockId, boolean>,
  };
}

// ——— Телефон ———

/** Телефон в базе и в ссылках — только так: +7 и десять цифр. */
export function isPhone(value: string): boolean {
  return /^\+7\d{10}$/.test(value);
}

/**
 * Телефон из формы → одиннадцать цифр, начиная с 7 (без «+»); null — если это не казахстанский номер.
 * Понимает привычные записи: «+7 771 484 63 44», «8 (771) 484-63-44», «7714846344».
 * Ничего, кроме цифр, пробелов, скобок, дефисов и «+» в начале, в поле быть не может.
 */
export function normalizePhoneDigits(raw: string): string | null {
  if (!/^\+?[\d\s()-]*$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");
  // Без «+» в начале: 8 XXX … — то же, что +7 XXX …, а десять цифр — номер без кода страны.
  // С «+» номер должен быть полным: иначе «+7» с пропущенной цифрой сошёл бы за номер без кода.
  if (!raw.trim().startsWith("+")) {
    if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
    if (digits.length === 10) digits = `7${digits}`;
  }
  return isPhone(`+${digits}`) ? digits : null;
}

/** «+77714846344» → «+7 771 484 63 44». */
export function formatPhone(phone: string): string {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

// ——— Instagram ———

/** Ссылка на Instagram в базе и на сайте — только так: https, instagram.com и имя профиля. */
export function isInstagramUrl(value: string): boolean {
  return /^https:\/\/instagram\.com\/[A-Za-z0-9._]{1,30}$/.test(value);
}

/**
 * Ссылка на Instagram из формы: принимает адрес профиля на instagram.com, «@имя» и просто «имя».
 * Введённый адрес в базу не попадает: из него берётся только имя профиля, а ссылка собирается заново —
 * всегда https://instagram.com/имя. Другие сайты и схемы (javascript:, data: и т. п.) → null.
 */
export function normalizeInstagram(raw: string): string | null {
  const value = raw.trim();
  const fromUrl = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?(?:[?#]\S*)?$/i.exec(value);
  const handle = fromUrl ? fromUrl[1] : value.replace(/^@/, "");
  const url = `https://instagram.com/${handle}`;
  return isInstagramUrl(url) ? url : null;
}

/** «https://instagram.com/имя» → «@имя» — для подсказок в админке. */
export function instagramHandle(url: string): string {
  return `@${url.replace(/^https:\/\/instagram\.com\//, "")}`;
}

// ——— Рейтинг 2ГИС ———

export const RATING_MIN_TENTHS = 10;
export const RATING_MAX_TENTHS = 50;

/** «5,0», «4.9», «5» → оценка в десятых (50, 49, 50); null — если это не оценка от 1 до 5 с одним знаком. */
export function parseRating(raw: string): number | null {
  const m = /^([1-5])(?:[.,](\d))?$/.exec(raw.trim());
  if (!m) return null;
  const tenths = Number(m[1]) * 10 + Number(m[2] ?? 0);
  return tenths >= RATING_MIN_TENTHS && tenths <= RATING_MAX_TENTHS ? tenths : null;
}

/** 50 → «5,0» */
export function formatRating(tenths: number): string {
  return `${Math.floor(tenths / 10)},${tenths % 10}`;
}

// ——— Девиз ———

/**
 * Девиз на первом экране: второе предложение выделено цветом («КҮШ. ШЫДАМДЫЛЫҚ. НӘТИЖЕ.»).
 * Если предложение одно — выделять нечего, весь девиз идёт обычным цветом.
 */
export function splitMotto(title: string): { before: string; accent: string; after: string } {
  const parts = title.trim().match(/[^.!?]+[.!?]*/g)?.map((p) => p.trim()).filter(Boolean) ?? [];
  if (parts.length < 2) return { before: title.trim(), accent: "", after: "" };
  return { before: parts[0], accent: parts[1], after: parts.slice(2).join(" ") };
}
