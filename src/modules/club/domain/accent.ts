// Цвет акцента Клуба (этап П1, решение 3, ADR 0018): из одного цвета — палитра для токенов темы, с правилом
// контраста WCAG AA (4,5:1). Чистые функции, без базы.

/** Фоны, на которых акцент бывает текстом (ссылки, подписи): страница, карточка, приподнятая карточка. */
export const ACCENT_SURFACES = ["#131315", "#1f1f23", "#2a2a2c"] as const;
/** Минимальный контраст текста (WCAG AA). */
export const MIN_CONTRAST = 4.5;

const HEX = /^#[0-9a-f]{6}$/;

/** «#F5E642» → «#f5e642»; не цвет — null. */
export function normalizeHex(value: string): string | null {
  const v = value.trim().toLowerCase();
  return HEX.test(v) ? v : null;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Смешать цвет с чёрным: share — доля чёрного (0…1). */
function darken(hex: string, share: number): string {
  return toHex(rgb(hex).map((c) => c * (1 - share)) as [number, number, number]);
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Контраст двух цветов по WCAG: от 1 до 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type AccentPalette = {
  /** Сам акцент: кнопки, плашки, текст-акцент на тёмном */
  accent: string;
  /** Текст и значки на акценте: тёмный оттенок акцента, иначе почти чёрный, иначе белый — что даёт 4,5:1 */
  ink: string;
  /** Чуть темнее акцента — конец градиента девиза */
  tint: string;
  /** Текст выделения мышью на акценте */
  inkSoft: string;
};

/**
 * Палитра из цвета акцента или причина отказа. Цвет принимается, только если он сам читается на всех фонах
 * (ACCENT_SURFACES) и на нём найдётся читаемый текст.
 */
export function accentPalette(value: string): { ok: true; palette: AccentPalette } | { ok: false; error: string } {
  const accent = normalizeHex(value);
  if (!accent) return { ok: false, error: "Цвет — в виде #RRGGBB, например #F5E642." };
  const weakest = Math.min(...ACCENT_SURFACES.map((s) => contrastRatio(accent, s)));
  if (weakest < MIN_CONTRAST) {
    return { ok: false, error: `Слишком тёмный цвет: на тёмном фоне сайта контраст ${weakest.toFixed(1)}:1, нужно не меньше ${MIN_CONTRAST}:1. Выберите цвет светлее.` };
  }
  const ink = [darken(accent, 0.78), "#131315", "#ffffff"].find((c) => contrastRatio(c, accent) >= MIN_CONTRAST);
  if (!ink) return { ok: false, error: "На этом цвете не читается ни тёмный, ни белый текст. Выберите другой цвет." };
  return { ok: true, palette: { accent, ink, tint: darken(accent, 0.12), inkSoft: darken(accent, 0.55) } };
}

/**
 * CSS-переменные темы для `style` корневого элемента. Начальный цвет — пустой объект: работают значения
 * `@theme` из globals.css, подобранные вручную, и сайт Athletic's Gym не меняется ни на байт. Негодный цвет
 * (в базу его не пустит форма, но мало ли) — тоже пусто.
 */
export function accentCssVars(value: string, defaultAccent: string): Record<string, string> {
  const r = accentPalette(value);
  if (!r.ok || r.palette.accent === normalizeHex(defaultAccent)) return {};
  const { accent, ink, tint, inkSoft } = r.palette;
  return {
    "--color-primary-container": accent,
    "--color-accent": accent,
    "--color-on-primary": ink,
    "--color-accent-ink": ink,
    "--color-surface-tint": tint,
    "--color-on-primary-container": inkSoft,
  };
}
