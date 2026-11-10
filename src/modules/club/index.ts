// Модуль Клуб (этап П1, ADR 0018): название, город, бренд и пояс Клуба как данные. Базовый: никого не импортирует.
// Снаружи — этот файл (сервер) и client.ts (браузер и чистый код).
import "server-only";

export * from "./client";
export { getClub } from "./service/club";
