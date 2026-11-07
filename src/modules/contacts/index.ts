// Модуль Обращения (этап 6, ADR 0015): счётчик нажатий на кнопки связи — Канал и Источник обращения,
// без персональных данных. Снаружи — только этот файл (сервер) и client.ts (браузер). Ни от кого не зависит.
import "server-only";

export * from "./client";
export { getContactStats, recordContact } from "./service/contacts";
