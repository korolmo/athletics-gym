// Лаборатория (ADR 0006, 0007): демо-стенд платформы с синтетическими данными. Признак — APP_ENV=lab.
// Боевой сайт клиента (APP_ENV=production) и локальный запуск Лабораторией не считаются: плашки там нет.

/**
 * Адрес боевого сайта клиента — только для подписи на плашке Лаборатории («боевой сайт — …»).
 * Это не адрес текущего сайта: тот берётся только из SITE_URL (src/lib/seo.ts).
 */
export const CLIENT_SITE = { host: "athleticsgym.kz", url: "https://athleticsgym.kz" } as const;

export function isLab(env: Record<string, string | undefined> = process.env): boolean {
  return env.APP_ENV?.trim() === "lab";
}

/** Текст плашки: {site} → адрес боевого сайта. */
export function labBannerText(template: string): string {
  return template.replace("{site}", CLIENT_SITE.host);
}
