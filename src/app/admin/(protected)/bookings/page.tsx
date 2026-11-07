import Link from "next/link";
import { requireOwner } from "@/modules/owner";
import { listBookingsForOwner } from "@/modules/bookings";
import { getClientContacts, formatPhone } from "@/modules/clients";
import { getTrainerNames, listTrainers } from "@/modules/trainers";
import { isHall } from "@/modules/tariffs/client";
import { addDays, formatClock, isDay, weekdayOf, zonedParts, zonedToUtc } from "@/lib/time";
import { HallFilter } from "../AdminNav";
import { CancelBookingForm } from "./CancelBookingForm";

// Раздел «Записи» (этап 1, макеты 16–17): Записи Клиентов к Тренерам за день, по Тренерам; отмена Владельцем.
export const dynamic = "force-dynamic";

const WD = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «+7 700 *** ** 01» — в списке телефон Клиента виден не целиком. */
function maskPhone(phone: string): string {
  const f = formatPhone(phone);
  return f.replace(/^(\+7 \d{3}) \d{3} \d{2}/, "$1 *** **");
}

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ day?: string; hall?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const today = zonedParts(new Date()).day;
  const day = sp.day && isDay(sp.day) ? sp.day : today;
  const hall = sp.hall && isHall(sp.hall) ? sp.hall : "general";
  const monday = addDays(day, 1 - weekdayOf(day));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const bookings = await listBookingsForOwner(zonedToUtc(day, 0), zonedToUtc(addDays(day, 1), 0), hall);
  const [contacts, names, trainers] = await Promise.all([
    getClientContacts(bookings.flatMap((b) => (b.clientId ? [b.clientId] : [])), requireOwner),
    getTrainerNames(bookings.flatMap((b) => (b.trainerId ? [b.trainerId] : []))),
    listTrainers(hall),
  ]);
  const byClient = new Map(contacts.map((c) => [c.id, c]));
  const columns = [
    ...trainers.map((t) => ({ id: t.id as string | null, name: t.name })),
    // Тренер перешёл в другой Зал после Записи — его Записи этого Зала всё равно видны
    ...Object.entries(names)
      .filter(([id]) => !trainers.some((t) => t.id === id))
      .map(([id, name]) => ({ id: id as string | null, name })),
    ...(bookings.some((b) => !b.trainerId) ? [{ id: null, name: "Тренер удалён" }] : []),
  ].map((col) => ({ ...col, items: bookings.filter((b) => b.trainerId === col.id) }));
  const active = bookings.filter((b) => b.status === "ACTIVE").length;
  const link = (d: string) => `/admin/bookings?day=${d}&hall=${hall}`;

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">Записи к тренерам</p>
      <h1 className="mb-1 font-display text-3xl uppercase tracking-wide">Записи</h1>
      <p className="mb-6 text-sm text-muted">
        {WD[weekdayOf(day) - 1]}, {Number(day.slice(8))} {MONTHS[Number(day.slice(5, 7)) - 1]} · действующих: {active}
      </p>

      <HallFilter base={`/admin/bookings?day=${day}`} hall={hall} />

      <nav aria-label="День" className="mb-6 flex items-center gap-1 rounded-2xl bg-card p-2">
        <Link href={link(addDays(monday, -7))} aria-label="Прошлая неделя" className="rounded-lg px-2 py-3 text-muted hover:text-fg">
          ‹
        </Link>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((d) => (
            <Link
              key={d}
              href={link(d)}
              aria-current={d === day ? "date" : undefined}
              className={`flex flex-col items-center rounded-xl py-2 ${d === day ? "bg-accent text-accent-ink" : d === today ? "text-accent" : "text-fg hover:bg-card-2"}`}
            >
              <span className="text-[11px] font-semibold">{WD[weekdayOf(d) - 1]}</span>
              <span className="text-lg font-bold">{Number(d.slice(8))}</span>
            </Link>
          ))}
        </div>
        <Link href={link(addDays(monday, 7))} aria-label="Следующая неделя" className="rounded-lg px-2 py-3 text-muted hover:text-fg">
          ›
        </Link>
      </nav>

      {columns.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">В этом зале нет тренеров.</p>
      ) : (
        <div className="space-y-4">
          {columns.map((col) => (
            <section key={col.id ?? "none"} className="rounded-2xl bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl uppercase tracking-wide">{col.name}</h2>
                <span className="text-sm text-muted">{col.items.filter((b) => b.status === "ACTIVE").length} зап.</span>
              </div>
              {col.items.length === 0 ? (
                <p className="text-sm text-muted">Записей на этот день нет.</p>
              ) : (
                <ul className="space-y-2">
                  {col.items.map((b) => {
                    const c = b.clientId ? byClient.get(b.clientId) : undefined;
                    const cancelled = b.status === "CANCELLED";
                    const past = !cancelled && b.endAt <= new Date();
                    return (
                      <li key={b.id} className={`rounded-xl border border-line bg-bg p-3 ${cancelled ? "opacity-60" : ""}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-lg bg-card-2 px-2.5 py-1 text-sm font-semibold tabular-nums">
                            {formatClock(zonedParts(b.startAt).minutes)} — {formatClock(zonedParts(b.endAt).minutes)}
                          </span>
                          <span className={`text-xs font-semibold ${cancelled ? "text-danger" : past ? "text-muted" : "text-wa"}`}>
                            ● {cancelled ? (b.cancelledBy === "owner" ? "Отменена залом" : "Отменена клиентом") : past ? "Завершено" : "Подтверждено"}
                          </span>
                        </div>
                        <p className="mt-2 font-semibold">{c?.name ?? "Клиент удалил аккаунт"}</p>
                        {c && <p className="font-mono text-sm text-muted">{maskPhone(c.phone)}</p>}
                        {!cancelled && !past && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {c && (
                              <a
                                href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-wa px-3 py-2 text-sm font-semibold text-bg"
                              >
                                Написать в WhatsApp
                              </a>
                            )}
                            <CancelBookingForm id={b.id} back={link(day)} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="mt-6 text-sm text-muted">Клиент увидит отмену в кабинете. Свободные окна считаются сами из часов работы тренера.</p>
    </>
  );
}
