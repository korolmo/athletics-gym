import { requireOwner } from "@/modules/owner";
import { countPending, listProblemEvents, resolveSender } from "@/modules/notifications";
import { EVENT_LABEL_RU, MAX_ATTEMPTS, whenLabel } from "@/modules/notifications/client";
import { Chip, Empty, Notice, PageHead, btnDark, btnPrimary, card } from "../../ui";
import { resolveEventAction, retryEventAction } from "./actions";

// «Недоставленные уведомления» — по макету design/stitch/admin/uvedomleniya-mobile.png: события о Записях, которые
// не ушли Владельцу в Telegram, — число попыток, последняя ошибка, «Отправить ещё раз» и «Пометить решённым».
export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Qyzylorda" }).format(d);

export default async function NotificationsPage() {
  await requireOwner();
  const [events, pending] = await Promise.all([listProblemEvents(requireOwner), countPending(requireOwner)]);
  const connected = resolveSender() !== null;
  const dead = events.filter((e) => e.status === "DEAD").length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHead
        title="Недоставленные"
        subtitle="Уведомления о записях, которые не дошли до вас в Telegram"
        aside={dead > 0 ? <Chip tone="danger">{dead} не доставлено</Chip> : <Chip tone="ok">всё доставлено</Chip>}
      />

      {!connected && (
        <div className="mb-6">
          <Notice tone="error">
            Telegram не подключён: уведомления о записях ждут в очереди ({pending}). Чтобы они приходили, разработчику нужно задать токен бота и чат
            (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).
          </Notice>
        </div>
      )}

      {events.length === 0 ? (
        <Empty>Недоставленных уведомлений нет. О каждой новой и отменённой записи вы узнаёте в Telegram.</Empty>
      ) : (
        <ul className="space-y-4">
          {events.map((e) => (
            <li key={e.id} className={card}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{EVENT_LABEL_RU[e.type] ?? e.type}</p>
              <h2 className="mt-1 text-xl font-bold">
                {e.event ? `${e.event.clientName} · ${whenLabel(e.event.startAt, e.event.endAt)}` : "Событие не разобрать"}
              </h2>
              {e.event && <p className="text-sm text-muted">{e.event.trainerName} · {e.event.hallName}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone="danger">
                  Попыток: {e.attempts} из {MAX_ATTEMPTS}
                </Chip>
                <Chip tone={e.status === "DEAD" ? "danger" : "accent"}>{e.status === "DEAD" ? "Не доставлено" : `Повтор в ${fmt(e.nextAttemptAt)}`}</Chip>
              </div>
              {e.lastError && (
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-bg p-4 font-mono text-sm text-danger [overflow-wrap:anywhere]">{e.lastError}</pre>
              )}
              <p className="mt-2 text-xs text-muted">Событие от {fmt(e.createdAt)} · #{e.id.slice(-6)}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <form action={retryEventAction} className="flex-1">
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" disabled={!connected} className={`${btnPrimary} w-full`}>
                    Отправить ещё раз
                  </button>
                </form>
                <form action={resolveEventAction} className="flex-1">
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className={`${btnDark} w-full`}>
                    Пометить решённым
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={`${card} mt-6 text-sm text-muted`}>
        Уведомления повторяются сами: каждые 5 минут, с растущей паузой между попытками. После {MAX_ATTEMPTS} неудачных попыток уведомление
        попадает сюда.
      </p>
    </div>
  );
}
