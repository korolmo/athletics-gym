// Модель домена: Залы, Категории тарифа, Время доступа, Аудитория и правила полей.
// Термины — GLOSSARY.md. Без подписей и форматирования (они в presentation/),
// без импорта @prisma/client: файл используется и в клиентских компонентах.
export const HALLS = ["general", "women"] as const;
export type HallId = (typeof HALLS)[number];

export const CATEGORY_ORDER = ["SINGLE", "VISITS", "UNLIMITED", "PERSONAL"] as const;
export type Category = (typeof CATEGORY_ORDER)[number];
/** Категории прайса Зала. Персональные тренировки — только у Тренеров. */
export const HALL_CATEGORIES = ["SINGLE", "VISITS", "UNLIMITED"] as const satisfies readonly Category[];

export const ACCESS = ["DAY", "FULL"] as const;
export type Access = (typeof ACCESS)[number];

export const AUDIENCES = ["ALL", "STUDENTS", "WOMEN", "MEN"] as const;
export type Audience = (typeof AUDIENCES)[number];

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
