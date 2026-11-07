// Модуль Отзывы — вход для браузера и для чистого кода: правила Отзыва, лимиты, подписи.
// Без сервиса, базы и подписи формы: index.ts тянет "server-only" (ADR 0015).
export * from "./domain/review";
export * from "./presentation/review-labels";
