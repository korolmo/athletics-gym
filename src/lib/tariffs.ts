// Без импорта @prisma/client: файл используется и в клиентских компонентах
export const HALLS = ["general", "women"] as const;
export type HallId = (typeof HALLS)[number];

export const CATEGORY_ORDER = ["SINGLE", "VISITS", "UNLIMITED", "PERSONAL"] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

export const ACCESS = ["DAY", "FULL"] as const;
export type Access = (typeof ACCESS)[number];

export const AUDIENCES = ["ALL", "STUDENTS", "WOMEN", "MEN"] as const;
export type Audience = (typeof AUDIENCES)[number];

// Подписи админки (она только на русском); подписи сайта — в словарях
export const HALL_LABEL_RU: Record<HallId, string> = {
  general: "Общий зал",
  women: "Женский зал",
};

export const CATEGORY_LABEL_RU: Record<Category, string> = {
  SINGLE: "Разовое посещение",
  VISITS: "Абонемент на посещения",
  UNLIMITED: "Безлимит",
  PERSONAL: "Персональная тренировка",
};

export const ACCESS_LABEL_RU: Record<Access, string> = {
  DAY: "Дневной (08:00–17:00)",
  FULL: "Весь день (08:00–23:00)",
};

export const AUDIENCE_LABEL_RU: Record<Audience, string> = {
  ALL: "Всем",
  STUDENTS: "Студентам",
  WOMEN: "Женщинам",
  MEN: "Мужчинам",
};

/** Какие поля имеют смысл для Категории — остальные форма прячет, а сервер обнуляет. */
export const CATEGORY_FIELDS: Record<
  Category,
  { visits: boolean; months: boolean; access: boolean; audience: boolean; trainer: boolean; title: boolean; priceTo: boolean }
> = {
  SINGLE: { visits: false, months: false, access: false, audience: false, trainer: false, title: false, priceTo: false },
  VISITS: { visits: true, months: false, access: true, audience: true, trainer: false, title: false, priceTo: false },
  UNLIMITED: { visits: false, months: true, access: false, audience: false, trainer: false, title: false, priceTo: false },
  PERSONAL: { visits: true, months: false, access: false, audience: true, trainer: true, title: true, priceTo: true },
};

export type TariffShape = {
  category: string;
  titleRu?: string | null;
  titleKk?: string | null;
  visitsPerMonth: number | null;
  durationMonths: number | null;
  access: string;
  audience: string;
  price: number;
  priceTo: number | null;
};

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatPrice(value: number): string {
  return `${formatNumber(value)} ₸`;
}

/** Цена Тарифа: точная или диапазон «от–до». */
export function formatTariffPrice(t: { price: number; priceTo: number | null }): string {
  return t.priceTo && t.priceTo > t.price ? `${formatNumber(t.price)} – ${formatPrice(t.priceTo)}` : formatPrice(t.price);
}

/** Русское склонение: plural(5, ["месяц", "месяца", "месяцев"]) → "месяцев". */
export function plural(n: number, forms: readonly string[]): string {
  if (forms.length < 3) return forms[0] ?? "";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Название Тарифа для админки, собранное из полей. */
export function tariffLabelRu(t: TariffShape): string {
  if (t.titleRu) return t.titleRu;
  switch (t.category) {
    case "SINGLE":
      return "Разовое посещение";
    case "VISITS":
      return `${t.visitsPerMonth ?? "?"} ${plural(t.visitsPerMonth ?? 0, ["посещение", "посещения", "посещений"])} в месяц`;
    case "UNLIMITED":
      return `Безлимит, ${t.durationMonths ?? "?"} ${plural(t.durationMonths ?? 0, ["месяц", "месяца", "месяцев"])}`;
    case "PERSONAL":
      return t.visitsPerMonth
        ? `${t.visitsPerMonth} ${plural(t.visitsPerMonth, ["тренировка", "тренировки", "тренировок"])} в месяц`
        : "Разовая тренировка";
    default:
      return t.category;
  }
}

/** Пометки Тарифа для админки: Аудитория и Время доступа. */
export function tariffTagsRu(t: TariffShape): string[] {
  const tags: string[] = [];
  if (isAudience(t.audience) && t.audience !== "ALL") tags.push(AUDIENCE_LABEL_RU[t.audience]);
  if (t.category === "VISITS" && isAccess(t.access)) tags.push(ACCESS_LABEL_RU[t.access]);
  return tags;
}

export function isHall(v: string): v is HallId {
  return (HALLS as readonly string[]).includes(v);
}

export function isCategory(v: string): v is Category {
  return (CATEGORY_ORDER as readonly string[]).includes(v);
}

export function isAccess(v: string): v is Access {
  return (ACCESS as readonly string[]).includes(v);
}

export function isAudience(v: string): v is Audience {
  return (AUDIENCES as readonly string[]).includes(v);
}
