// Модуль Тарифы — вход для браузера и для чистого кода: правила Тарифов и русские подписи.
// Без сервиса и базы: index.ts тянет "server-only" (ADR 0015).
export * from "./domain/tariff";
export * from "./presentation/tariff-labels";
