// Платформа: склонение по числу. Раньше жило в подписях Тарифов, но им пользуются и рейтинг, и раздел «Сайт».

/** Русское склонение: plural(5, ["месяц", "месяца", "месяцев"]) → "месяцев". Меньше трёх форм — первая. */
export function plural(n: number, forms: readonly string[]): string {
  if (forms.length < 3) return forms[0] ?? "";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
