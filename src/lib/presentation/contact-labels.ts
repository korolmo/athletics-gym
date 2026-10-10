// Как Обращения называются в админке (она только на русском).
import type { ContactChannel, ContactSource } from "@/lib/domain/contact";

export const CONTACT_CHANNEL_LABEL_RU: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  phone: "Телефон",
  instagram: "Instagram",
};

export const CONTACT_SOURCE_LABEL_RU: Record<ContactSource, string> = {
  header: "Шапка",
  hero: "Первый экран",
  directions: "С чем помогут тренеры",
  women: "Женский зал",
  prices: "Цены",
  trainer: "Карточка тренера",
  reviews: "Отзывы",
  contacts: "Контакты",
  footer: "Подвал",
  "mobile-bar": "Нижняя панель на телефоне",
  floating: "Круглая кнопка WhatsApp",
};

/** Источник, которого уже нет в списке (сайт изменился), показываем как есть. */
export function contactSourceLabelRu(source: string): string {
  return (CONTACT_SOURCE_LABEL_RU as Record<string, string>)[source] ?? source;
}

/** «2026-10-10» → «10 окт.» */
export function formatDayRu(day: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}
