// Модуль Аккаунт Владельца (этап 6, ADR 0015): вход, сессия, лимит попыток входа, смена пароля и проверка
// доступа requireOwner. Базовый модуль: requireOwner берут все модули, сам он о них не знает.
// Снаружи — этот файл (сервер) и client.ts (middleware и браузер: cookie сессии, правила пароля, лимиты).
import "server-only";

export * from "./client";
export * from "./domain/owner";
export { parsePasswordChangeForm, passwordChangeSchema, type PasswordChangeInput } from "./validation/account";
export { requireOwner, requireRealOwner } from "./service/guard";
export { createSession, currentRole, destroySession, isAuthed, isGuest } from "./service/session-cookie";
export { OWNER_ID, findOwner, getOwnerSessionVersion, loginOwner, passwordTools } from "./service/owner-account";
export { changeOwnerPassword, getAccountLogin, revokeAllSessions } from "./service/account";
export { checkLoginLimit, clearFailedLogins, recordFailedLogin } from "./service/login-limit";
export { hashPassword, verifyPassword } from "./service/password";
// Двухфакторный вход (этап 2, ADR 0024): домен готов раньше этапа, подключается вместе с полями 2FA у Аккаунта Владельца
export * from "./domain/totp";
export * from "./domain/totp-secret";
