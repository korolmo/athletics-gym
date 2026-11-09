import Link from "next/link";
import { requireOwner } from "@/modules/owner";
import { listBookingsForOwner } from "@/modules/bookings";
import { getClientContacts, formatPhone } from "@/modules/clients";
import { getTrainerNames, listTrainers } from "@/modules/trainers";
import { isHall } from "@/modules/tariffs/client";
import { addDays, formatClock, isDay, weekdayOf, zonedParts, zonedToUtc } from "@/lib/time";
import { UserIcon } from "@/components/icons";
import { HallFilter } from "../AdminNav";
import { Empty, PageHead, card } from "../../ui";
import { BookingItem, type BookingItemView } from "./BookingItem";

// Раздел «Записи» — по макетам 17 (компьютер: колонки Тренеров) и 16 (телефон: карточка Записи снизу).
// Из макета не взяты загрузка зала в процентах, «Новая запись» от Владельца, синхронизация с 1С и экспорт табеля —
// таких функций нет. Записи создают только Клиенты в кабинете.
export const dynamic = "force-dynamic";

const WD = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const HALL_NAME: Record<string, string> = { general: "Общий зал", women: "Женский зал" };

/** «+7 700 *** ** 01» — в списке телефон Клиента виден не целиком. */
function maskPhone(phone: string): string {
  return formatPhone(phone).replace(/^(\+7 \d{3}) \d{3} \d{2}/, "$1 *** **");
}

const dayLabel = (d: string) => `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;

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
  const now = new Date();
  const columns = [
    ...trainers.map((t) => ({ id: t.id as string | null, name: t.name })),
    // Тренер перешёл в другой Зал после Записи — его Записи этого Зала всё равно видны
    ...Object.entries(names)
      .filter(([id]) => !trainers.some((t) => t.id === id))
      .map(([id, name]) => ({ id: id as string | null, name })),
    ...(bookings.some((b) => !b.trainerId) ? [{ id: null, name: "Тренер удалён" }] : []),
  ].map((col) => ({
    ...col,
    items: bookings
      .filter((b) => b.trainerId === col.id)
      .map((b): BookingItemView => {
        const c = b.clientId ? byClient.get(b.clientId) : undefined;
        return {
          id: b.id,
          time: `${formatClock(zonedParts(b.startAt).minutes)} — ${formatClock(zonedParts(b.endAt).minutes)}`,
          status:
            b.status === "CANCELLED" ? (b.cancelledBy === "owner" ? "cancelledByOwner" : "cancelledByClient") : b.endAt <= now ? "past" : "active",
          clientName: c?.name ?? "Клиент удалил аккаунт",
          phoneMasked: c ? maskPhone(c.phone) : null,
          whatsapp: c ? c.phone.replace(/\D/g, "") : null,
          trainerName: col.name,
          hallName: HALL_NAME[b.hallId] ?? b.hallId,
          dayLabel: `${WD[weekdayOf(day) - 1].charAt(0)}${WD[weekdayOf(day) - 1].slice(1).toLowerCase()}, ${dayLabel(day)}`,
        };
      }),
  }));
  const active = bookings.filter((b) => b.status === "ACTIVE").length;
  const link = (d: string) => `/admin/bookings?day=${d}&hall=${hall}`;

  return (
    <>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">
        Записи к тренерам · <span className="text-muted">{MONTHS_NOM[Number(day.slice(5, 7)) - 1]} {day.slice(0, 4)}</span>
      </p>
      <PageHead
        title="Записи на тренировки"
        subtitle={`${WD[weekdayOf(day) - 1]}, ${dayLabel(day)} · действующих: ${active}`}
      />

      <div className={`${card} mb-6 flex flex-col gap-4 p-3 lg:flex-row lg:items-center lg:p-4`}>
        <div className="lg:w-80 [&>div]:mb-0">
          <HallFilter base={`/admin/bookings?day=${day}`} hall={hall} />
        </div>
        <nav aria-label="День" className="flex flex-1 items-center gap-1">
          <Link href={link(addDays(monday, -7))} aria-label="Прошлая неделя" className="rounded-lg px-2 py-3 text-xl text-muted hover:text-fg">
            ‹
          </Link>
          <div className="grid flex-1 grid-cols-7 gap-1">
            {week.map((d) => (
              <Link
                key={d}
                href={link(d)}
                aria-current={d === day ? "date" : undefined}
                className={`flex flex-col items-center rounded-xl py-2 ${
                  d === day ? "bg-accent text-accent-ink" : d === today ? "text-accent hover:bg-card-2" : "text-fg hover:bg-card-2"
                }`}
              >
                <span className={`text-[11px] font-semibold ${weekdayOf(d) >= 6 && d !== day ? "text-danger" : ""}`}>{WD[weekdayOf(d) - 1]}</span>
                <span className="text-lg font-bold">{Number(d.slice(8))}</span>
              </Link>
            ))}
          </div>
          <Link href={link(addDays(monday, 7))} aria-label="Следующая неделя" className="rounded-lg px-2 py-3 text-xl text-muted hover:text-fg">
            ›
          </Link>
        </nav>
        <span className="hidden whitespace-nowrap text-sm font-semibold text-muted xl:block">
          {dayLabel(monday)} — {dayLabel(addDays(monday, 6))}
        </span>
      </div>

      {columns.length === 0 ? (
        <Empty>В этом зале нет тренеров.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {columns.map((col) => (
            <section key={col.id ?? "none"} className={`${card} p-4`}>
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-bg p-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card-2 text-muted">
                  <UserIcon className="h-6 w-6" />
                </span>
                <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{col.name}</h2>
                <span className="text-right text-sm leading-tight">
                  <span className="block text-xl font-extrabold text-accent">{col.items.filter((b) => b.status === "active").length}</span>
                  <span className="text-muted">записей</span>
                </span>
              </div>
              {col.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">Записей на этот день нет</p>
              ) : (
                <ul className="space-y-3">
                  {col.items.map((b) => (
                    <BookingItem key={b.id} b={b} back={link(day)} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="mt-6 text-sm text-muted">Записи делают клиенты в кабинете. Свободное время считается само из часов работы тренера.</p>
    </>
  );
}
