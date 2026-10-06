// Без импорта @prisma/client: файл используется и в клиентских компонентах
export const CATEGORY_ORDER = ["MONTHLY", "YEARLY", "SINGLE", "PERSONAL"] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

export const UNITS = ["DAY", "MONTH", "VISIT"] as const;
export type Unit = (typeof UNITS)[number];

export const CATEGORY_LABEL_RU: Record<Category, string> = {
  MONTHLY: "Месячный",
  YEARLY: "Годовой",
  SINGLE: "Разовое посещение",
  PERSONAL: "Персональная тренировка",
};

export const UNIT_LABEL_RU: Record<Unit, string> = {
  DAY: "дней",
  MONTH: "мес.",
  VISIT: "посещ.",
};

export const UNIT_LABEL_KK: Record<Unit, string> = {
  DAY: "күн",
  MONTH: "ай",
  VISIT: "рет",
};

export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

export function isCategory(v: string): v is Category {
  return (CATEGORY_ORDER as readonly string[]).includes(v);
}

export function isUnit(v: string): v is Unit {
  return (UNITS as readonly string[]).includes(v);
}
