// Cookie языка: её ставит middleware, чтобы адрес без языка вёл на выбранную версию сайта.
// Отдельный файл без зависимостей: его берут и middleware, и текст Политики конфиденциальности.

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
