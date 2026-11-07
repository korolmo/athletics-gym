// Телефон Клиента — его логин (ADR 0016). Только мобильные номера Казахстана: +7 7XX XXX XX XX.

/**
 * Приводит ввод к виду +77XXXXXXXXX или возвращает null.
 * Принимает «+7 (701) 234-56-78», «87012345678», «7012345678» и т. п.: всё, кроме цифр и ведущего «+», отбрасывается.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national: string;
  if (digits.length === 10) national = digits;
  else if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) national = digits.slice(1);
  else return null;
  // Мобильные коды Казахстана: 700–708, 747, 770–778. Городские номера (коды 71x–73x, Кызылорда — 7242) не принимаем:
  // код входа на них не дойдёт
  if (!/^7(?:0[0-8]|47|7[0-8])\d{7}$/.test(national)) return null;
  return `+7${national}`;
}

/** +77012345678 → «+7 701 234 56 78» для показа. */
export function formatPhone(phone: string): string {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/**
 * Тестовые номера Лаборатории: только на них демо-канал выдаёт код (ADR 0016) — настоящий номер
 * в Лаборатории войти не может, и персональных данных там не появляется. +7 700 000 00 01 … 09.
 */
export const DEMO_PHONES: readonly string[] = Array.from({ length: 9 }, (_, i) => `+7700000000${i + 1}`);

export function isDemoPhone(phone: string): boolean {
  return DEMO_PHONES.includes(phone);
}
