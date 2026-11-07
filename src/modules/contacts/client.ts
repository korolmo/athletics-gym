// Модуль Обращения — вход для браузера (ContactTracker) и для чистого кода: Каналы, Источники, подписи.
// Без сервиса и базы: index.ts тянет "server-only" (ADR 0015).
export * from "./domain/contact";
export * from "./presentation/contact-labels";
