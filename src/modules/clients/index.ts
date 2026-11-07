// Модуль Клиенты (этап 1, ADR 0016): Клиент, вход по телефону и одноразовому коду, сессия, Согласие, профиль.
// Базовый модуль, как Аккаунт Владельца: requireClient берут модули кабинета, сам он о них не знает.
// Снаружи — этот файл (сервер) и client.ts (middleware и браузер).
import "server-only";

export * from "./client";
export { parseCodeRequest, parseCodeVerify, parseProfile, type CodeVerifyInput } from "./validation/login";
export { demoChannel, resolveCodeChannel, type CodeChannel, type Delivery } from "./service/code-channel";
export { requestLoginCode, verifyLoginCode, type CodeRequestResult, type CodeVerifyResult } from "./service/login";
export { createClientSession, currentClient, destroyClientSession, requireClient } from "./service/session-cookie";
export { deleteClientAccount, deleteInactiveClients, revokeAllClientSessions, updateClientName } from "./service/profile";
