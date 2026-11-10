// Модуль Клиенты — вход без server-only: middleware (подпись cookie сессии на Web Crypto) и браузер
// (правила телефона и кода в формах кабинета). Сервисы на node:crypto и базе — только в index.ts (ADR 0015, 0016).
export * from "./domain/phone";
export * from "./domain/client";
export * from "./domain/session";
export * from "./domain/login-code.rules";
