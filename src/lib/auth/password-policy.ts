// Требования к паролю Владельца — без зависимостей: нужны и форме в браузере, и проверке на сервере.

export const PASSWORD_MIN_LENGTH = 8;
/** Предел bcrypt: дальше 72 байт он пароль не читает. */
export const PASSWORD_MAX_BYTES = 72;

export function passwordBytes(password: string): number {
  return new TextEncoder().encode(password).length;
}
