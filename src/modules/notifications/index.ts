// Модуль Уведомления (этап 1, ADR 0017): transactional outbox и отправка Владельцу в Telegram.
// Ни от кого не зависит: событие передаёт модуль-хозяин в своей транзакции (enqueue), проверку Владельца —
// слой приложения. Снаружи — этот файл (сервер) и client.ts.
import "server-only";

export * from "./client";
export { resolveAlertSender, resolveSender, telegramSender, type SendResult, type Sender } from "./service/telegram";
export {
  countDead,
  countPending,
  deliveryStats,
  deliverAlerts,
  deliverPending,
  enqueue,
  raiseAlerts,
  type AlertRules,
  type BurnState,
  listProblemEvents,
  resolveEvent,
  retryEvent,
  type DeliveryReport,
  type ProblemEvent,
} from "./service/outbox";
