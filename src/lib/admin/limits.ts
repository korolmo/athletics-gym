// Пределы полей админки: одни и те же числа для проверки на сервере и maxLength в формах
export const LIMITS = {
  /** Имя Тренера */
  name: 80,
  /** Уточнение Тарифа */
  title: 80,
  /** Описание Тренера */
  description: 600,
  /** Цена в тенге */
  price: 10_000_000,
  visitsPerMonth: 100,
  durationMonths: 60,
  sortOrder: 9999,
} as const;
