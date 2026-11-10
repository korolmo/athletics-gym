import "server-only";
import { after } from "next/server";
import { deliverPending, resolveSender } from "@/modules/notifications";
import { logError } from "@/lib/observability/log";

// Попутная отправка очереди уведомлений (ADR 0017, уточнено 10 ноября). Cron GitHub для повторов ненадёжен:
// в первый день `*/5` не сработал ни разу, а суточный monitor.yml пришёл с опозданием на 8 часов; на hoster.kz
// планировщика нет вовсе. Поэтому отправщик запускается после ответа на запросы, которые и так идут:
// действие Клиента (сразу, `force`), страницы кабинета и админки, /api/health/ready (UptimeRobot — каждые 5 минут).
// Чаще раза в минуту на экземпляр не запускаем: без ждущих событий проход — один запрос к базе по индексу.

export const KICK_GAP_MS = 60_000;
let lastKick = 0;

/** Запустить отправщик после ответа. Без канала (нет бота) — ничего. `force` — без паузы, сразу после Записи. */
export function kickOutbox({ force = false, now = Date.now() }: { force?: boolean; now?: number } = {}): boolean {
  const sender = resolveSender();
  if (!sender) return false;
  if (!force && now - lastKick < KICK_GAP_MS) return false;
  lastKick = now;
  after(() => deliverPending(sender).catch((e) => logError("Очередь уведомлений: попутная отправка не удалась.", e)));
  return true;
}
