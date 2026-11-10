// Название, город, ссылки 2ГИС и точка на карте — у Клуба (модуль club, этап П1); в тексты их подставляет
// src/app/brand.ts. Телефон, WhatsApp, Instagram, адрес и часы — в Настройках сайта. Адрес сайта — SITE_URL.

/** Ссылка-Обращение: WhatsApp зала (номер из Настроек сайта, только цифры) с готовым текстом. */
export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
