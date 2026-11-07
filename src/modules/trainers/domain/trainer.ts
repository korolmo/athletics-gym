// Правила порядка Тренеров в списке своего Зала

/**
 * Порядок при правке Тренера: пустое поле в форме значит «не менять».
 * Возвращает поля для обновления — пустой объект, если порядок не задан.
 */
export function sortOrderOnUpdate(sortOrder: number | null): { sortOrder?: number } {
  return sortOrder === null ? {} : { sortOrder };
}

/** Порядок нового Тренера: заданный в форме, иначе — в конец списка Зала. */
export function sortOrderOnCreate(sortOrder: number | null, lastInHall: number | null): number {
  return sortOrder ?? (lastInHall ?? -1) + 1;
}
