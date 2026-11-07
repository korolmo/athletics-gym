// Направление — с чем помогают Тренеры зала. Модель и правила — чистые функции.

import { pick, type Locale } from "@/lib/i18n";

/** Иконки, из которых Владелец выбирает картинку Направления. Сами рисунки — в components/site/direction-icons.tsx. */
export const DIRECTION_ICONS = [
  "exercise",
  "weight",
  "accessibility",
  "barbell",
  "boxing",
  "run",
  "stretch",
  "yoga",
  "rehab",
  "nutrition",
  "martial",
  "cardio",
  "timer",
  "fire",
] as const;
export type DirectionIcon = (typeof DIRECTION_ICONS)[number];

export function isDirectionIcon(value: string): value is DirectionIcon {
  return (DIRECTION_ICONS as readonly string[]).includes(value);
}

export const DIRECTION_LIMITS = { title: 60, description: 200 } as const;

export type DirectionRow = {
  id: string;
  titleRu: string;
  titleKk: string | null;
  descriptionRu: string | null;
  descriptionKk: string | null;
  icon: string;
  photo: string | null;
  isVisible: boolean;
  sortOrder: number;
};

/** Направление на языке страницы — то, что получает секция сайта. */
export type DirectionView = {
  id: string;
  title: string;
  description: string | null;
  icon: DirectionIcon;
  /** Своё Фото — готовой ссылкой; пусто — показываем иконку */
  photoUrl: string | null;
};

/**
 * Направления для сайта: только не скрытые, в порядке, который задал Владелец.
 * Неизвестная иконка (набор изменился) заменяется первой из набора — карточка не должна ломаться.
 */
export function toDirectionViews(locale: Locale, rows: DirectionRow[], photoUrl: (path: string | null) => string | null): DirectionView[] {
  return rows
    .filter((r) => r.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      id: r.id,
      title: pick(locale, r.titleRu, r.titleKk),
      description: r.descriptionRu?.trim() ? pick(locale, r.descriptionRu, r.descriptionKk) : null,
      icon: isDirectionIcon(r.icon) ? r.icon : DIRECTION_ICONS[0],
      photoUrl: photoUrl(r.photo),
    }));
}

/** Сдвиг на одно место вверх или вниз: новый порядок id; null — двигать некуда или такого id нет. */
export function moveInOrder(ids: string[], id: string, direction: "up" | "down"): string[] | null {
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
