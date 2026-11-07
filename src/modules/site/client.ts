// Модуль Сайт — вход для браузера и для чистого кода: правила и начальные значения Настроек, подписи, рейтинг.
// Без сервиса и базы: index.ts тянет "server-only" (ADR 0015).
export * from "./domain/site-settings";
export * from "./domain/site-settings.defaults";
export * from "./presentation/site-settings-labels";
export * from "./presentation/rating";
