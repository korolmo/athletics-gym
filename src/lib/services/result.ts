/** Итог операции сервиса: данные или сообщение для показа в форме. */
export type ServiceResult<T> = ({ ok: true } & T) | { ok: false; error: string };
