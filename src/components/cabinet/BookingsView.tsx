import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { whatsappUrl } from "@/lib/site";
import type { ClientBooking } from "@/modules/bookings";
import type { CabinetDictionary } from "@/dictionaries/cabinet/ru";
import { ArrowForwardSym, ChatSym, CheckSym, FitnessCenterSym } from "./icons";
import { AddSym, InfoSym, PersonSym } from "./icons";
import { CancelBookingButton } from "./CancelBookingButton";
import { btnPrimary, card, h1, waLink } from "./ui";
import { dateBlock, fill, fullWhen, shortWhen, timeRange } from "./format";

type Props = {
  locale: Locale;
  t: CabinetDictionary;
  halls: Record<string, string>;
  name: string;
  bookings: ClientBooking[];
  trainerNames: Record<string, string>;
  whatsapp: string;
  waHref: string;
  max: number;
  deadlineHours: number;
};

/** «Мои Записи»: по макетам 7 (есть Записи) и 8 (пусто). */
export function BookingsView({ locale, t, halls, name, bookings, trainerNames, whatsapp, waHref, max, deadlineHours }: Props) {
  const upcoming = bookings.filter((b) => b.view === "upcoming");
  const past = bookings.filter((b) => b.view !== "upcoming").slice(0, 10);
  const trainer = (b: ClientBooking) => (b.trainerId && trainerNames[b.trainerId]) || t.bookings.trainerGone;
  const bookHref = `/${locale}/cabinet/book`;

  return (
    <>
      <p className="text-body-lg text-text-muted">{fill(t.bookings.hello, { name })}</p>
      <h1 className={`${h1} mt-1`}>{t.bookings.title}</h1>

      {bookings.length === 0 ? (
        <>
          <section className={`${card} mt-6 bg-gradient-to-br from-surface-card to-surface-container-low py-10 text-center`}>
            <span className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary-container/10 text-primary-container">
              <FitnessCenterSym className="h-10 w-10" />
              <span aria-hidden="true" className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary-container" />
            </span>
            <h2 className="mt-6 text-headline-sm text-text-primary">{t.bookings.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-sm text-body-lg text-text-muted">{t.bookings.emptyText}</p>
            <Link href={bookHref} className={`${btnPrimary} mt-8`}>
              <AddSym className="h-6 w-6" />
              {t.bookings.book}
            </Link>
          </section>
          <p className={`${card} mt-4 flex items-start gap-4 text-body-lg text-text-muted`}>
            <InfoSym className="mt-0.5 h-6 w-6 shrink-0 text-primary-container" />
            {fill(t.bookings.rules, { max, h: deadlineHours })}
          </p>
        </>
      ) : (
        <>
          <Link href={bookHref} className={`${btnPrimary} mt-6`}>
            <AddSym className="h-6 w-6" />
            {t.bookings.book}
          </Link>

          <div className="mt-8 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-headline-sm uppercase text-text-primary">
              {t.bookings.upcoming}
              <span className="rounded-full bg-surface-container-high px-3 py-0.5 text-[13px] font-bold text-text-muted">
                {fill(t.bookings.ofLimit, { n: upcoming.length, max })}
              </span>
            </h2>
            <span className="text-body-md text-text-muted">{t.bookings.limitLabel}</span>
          </div>

          <ul className="mt-4 space-y-4">
            {upcoming.map((b) => {
              const d = dateBlock(b.startAt, t);
              const when = fullWhen(b.startAt, b.endAt, t);
              return (
                <li key={b.id} className={card}>
                  <div className="flex gap-4">
                    <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl bg-surface-container-lowest py-3">
                      <span className="text-[32px] font-extrabold leading-none text-primary-container">{d.day}</span>
                      <span className="mt-1 text-[13px] font-extrabold tracking-wider text-text-primary">{d.month}</span>
                      <span className="text-[13px] text-text-muted">{d.weekday}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[22px] font-bold text-text-primary">{timeRange(b.startAt, b.endAt)}</span>
                        <span className="rounded-md bg-surface-container-high px-3 py-1 text-body-md text-text-muted">{halls[b.hallId] ?? b.hallId}</span>
                      </div>
                      <p className="mt-3 flex items-center gap-3 text-body-lg text-text-primary">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-text-muted">
                          <PersonSym className="h-6 w-6" />
                        </span>
                        {trainer(b)}
                      </p>
                    </div>
                  </div>
                  {b.canCancel ? (
                    <div className="mt-4 flex justify-end">
                      <CancelBookingButton locale={locale} bookingId={b.id} label={t.bookings.cancel} confirm={fill(t.bookings.cancelConfirm, { when })} />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl bg-surface-container-lowest p-4">
                      <p className="flex items-start gap-2 text-body-md text-text-muted">
                        <InfoSym className="mt-0.5 h-5 w-5 shrink-0" />
                        {fill(t.bookings.lateNote, { h: deadlineHours })}
                      </p>
                      <a
                        href={whatsappUrl(whatsapp, fill(t.bookings.waCancel, { when: `${when}, ${trainer(b)}` }))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${waLink} mt-3`}
                      >
                        <ChatSym className="h-5 w-5" />
                        {t.bookings.writeHall}
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {past.length > 0 && (
            <>
              <div className="mt-10 flex items-center justify-between">
                <h2 className="text-headline-sm uppercase text-text-muted">{t.bookings.past}</h2>
                <span className="text-body-md text-text-muted">{t.bookings.history}</span>
              </div>
              <ul className="mt-4 space-y-3">
                {past.map((b) => (
                  <li key={b.id} className="flex items-center gap-4 rounded-2xl bg-surface-card px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-text-muted">
                      <CheckSym className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-lg text-text-muted">{shortWhen(b.startAt, t)}</p>
                      <p className="text-body-lg text-text-muted">{trainer(b)}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-surface-container-high px-3 py-1 text-body-md text-text-muted">
                      {b.view === "past" ? t.bookings.done : t.bookings.cancelled}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${card} mt-6 flex items-center gap-4`}>
        <ChatSym className="h-7 w-7 shrink-0 text-whatsapp-green" />
        <span className="flex-1 text-body-lg text-text-primary">{t.bookings.questions}</span>
        <span className="font-bold text-whatsapp-green">{t.login.writeWa}</span>
        <ArrowForwardSym className="h-6 w-6 text-whatsapp-green" />
      </a>
    </>
  );
}
