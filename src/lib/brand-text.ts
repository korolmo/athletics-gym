// Шаблоны бренда в текстах (этап П1, ADR 0018): в словарях вместо названия и города — метки {club}, {city},
// {inCity} и другие; значения приходят из Клуба через слой приложения (платформа модули не импортирует).

/** Метки, которые знают словари. Значение — уже на языке страницы. */
export const BRAND_KEYS = ["club", "city", "inCity", "since", "seoDescription", "twoGis", "twoGisReviews", "twoGisRoute", "mapEmbed"] as const;
export type BrandVars = Record<(typeof BRAND_KEYS)[number], string>;

const TOKEN = new RegExp(`\\{(${BRAND_KEYS.join("|")})\\}`, "g");

/** Подставить значения во все строки объекта (словаря) — глубоко; остальное не трогает. Исходник не меняется. */
export function fillBrand<T>(value: T, vars: BrandVars): T {
  if (typeof value === "string") return value.replace(TOKEN, (_, k: keyof BrandVars) => vars[k]) as T;
  if (Array.isArray(value)) return value.map((v) => fillBrand(v, vars)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillBrand(v, vars);
    return out as T;
  }
  return value;
}

/** Есть ли в строке незаполненная метка бренда — для тестов и проверки готовой страницы. */
export function hasBrandToken(text: string): boolean {
  return new RegExp(TOKEN.source).test(text);
}
