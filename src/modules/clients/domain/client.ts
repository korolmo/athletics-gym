// Клиент (GLOSSARY): человек со своим входом в личный кабинет. Правила — без базы.

/** Имя Клиента: как его называть в зале. */
export const CLIENT_NAME_MAX = 60;

/** Аккаунт без входа дольше 12 месяцев удаляется автоматически. Срок назван в Политике конфиденциальности. */
export const INACTIVE_DELETE_MS = 365 * 24 * 60 * 60 * 1000;

/** Ошибки форм входа и профиля — кодами: кабинет двуязычный, текст берётся из словаря по коду. */
export const LOGIN_FORM_ERRORS = ["phone", "code", "name", "nameLong", "consent"] as const;
export type LoginFormError = (typeof LOGIN_FORM_ERRORS)[number];

/** Что о Клиенте знает кабинет. */
export type ClientIdentity = { id: string; phone: string; name: string };

/** Сессия действует, только если её версия совпадает с версией в аккаунте Клиента. */
export function isClientSessionCurrent(session: { version: number }, current: number | null): boolean {
  return current !== null && session.version === current;
}

/** Пора ли удалить неактивный аккаунт. */
export function isInactive(lastLoginAt: Date, now: Date): boolean {
  return now.getTime() - lastLoginAt.getTime() > INACTIVE_DELETE_MS;
}
