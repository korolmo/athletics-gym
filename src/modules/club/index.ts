// Модуль Клуб (этап П1, ADR 0018): название, город, бренд и пояс Клуба как данные. Базовый: никого не импортирует,
// кроме Аккаунта Владельца (requireOwner для формы). Снаружи — этот файл (сервер) и client.ts (браузер и чистый код).
import "server-only";

export * from "./client";
export { clubSchema, parseClubForm, type ClubInput } from "./validation/club";
export { getClub } from "./service/club";
export { clearLogoPhoto, getClubForEdit, readLogoPhoto, saveClub, setLogoPhoto } from "./service/edit";
