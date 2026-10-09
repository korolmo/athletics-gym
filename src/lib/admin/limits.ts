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
  /** Настройки сайта: девиз и подзаголовок первого экрана */
  motto: 80,
  subtitle: 300,
  /** Карточка «О зале»: подпись, заголовок, текст */
  cardKicker: 30,
  cardTitle: 60,
  cardText: 200,
  womenText: 600,
  address: 160,
  hours: 80,
  ratingCount: 1_000_000,
  /** Подпись фото Галереи */
  caption: 80,
} as const;
