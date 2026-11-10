// Модуль Уведомления (этап 1, ADR 0017): transactional outbox и отправка Владельцу в Telegram.
// Ни от кого не зависит: событие передаёт модуль-хозяин в своей транзакции (enqueue), проверку Владельца —
// слой приложения. Снаружи — этот файл (сервер) и client.ts.
import "server-only";

export * from "./client";
export { resolveSender, telegramSender, type SendResult, type Sender } from "./service/telegram";
export {
  countDead,
  countPending,
  deliverPending,
  enqueue,
  listProblemEvents,
  resolveEvent,
  retryEvent,
  type DeliveryReport,
  type ProblemEvent,
} from "./service/outbox";
