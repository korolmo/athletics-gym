"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { bookAction, windowsAction, type BookState, type WindowsResult } from "@/app/[locale]/cabinet/actions";
import type { Locale } from "@/lib/i18n";
import { addDays, weekdayOf, zonedParts, type Day } from "@/lib/time";
import { BOOKING_HORIZON_DAYS } from "@/modules/schedule/client";
import type { CabinetDictionary } from "@/dictionaries/cabinet/ru";
import { ArrowForwardSym, ChatSym, CheckSym, ExerciseSym, FemaleSym } from "./icons";
import { CalendarMonthSym, ChevronRightSym, EventAvailableSym, EventBusySym, InfoSym, PersonSym, ScheduleSym, ShieldSym } from "./icons";
import { IconHalo, Pill, StepTitle, btnDark, btnPrimary, card, h1, waLink } from "./ui";
import { clock, deadlineText, fill, fullWhen, longDay, timeRange } from "./format";

type Trainer = { id: string; name: string; hallId: string };
type Props = {
  locale: Locale;
  t: CabinetDictionary;
  halls: { id: string; name: string }[];
  trainers: Trainer[];
  upcoming: { start: string; trainer: string }[];
  max: number;
  deadlineHours: number;
  waHref: string;
};

const chip = "flex items-center justify-center rounded-xl text-[17px] font-semibold transition";

export function BookingFlow({ locale, t, halls, trainers, upcoming, max, deadlineHours, waHref }: Props) {
  const [hallId, setHallId] = useState(halls[0]?.id ?? "general");
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [data, setData] = useState<WindowsResult | null>(null);
  const [day, setDay] = useState<Day | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, action, pending] = useActionState<BookState, FormData>(bookAction, { status: "idle" });
  const [dismissed, setDismissed] = useState<BookState | null>(null);
  const result = dismissed === state ? null : state.status === "idle" ? null : state;

  const hallTrainers = trainers.filter((tr) => tr.hallId === hallId);
  const trainer = trainers.find((tr) => tr.id === trainerId) ?? null;
  const today = zonedParts(new Date()).day;
  const days = Array.from({ length: BOOKING_HORIZON_DAYS }, (_, i) => addDays(today, i));
  const byDay = useMemo(() => {
    const map = new Map<Day, { start: string; end: string }[]>();
    for (const w of data?.windows ?? []) {
      const d = zonedParts(new Date(w.start)).day;
      map.set(d, [...(map.get(d) ?? []), w]);
    }
    return map;
  }, [data]);
  const selected = data?.windows.find((w) => w.start === start) ?? null;
  // Ключ повтора — свой у каждой выбранной пары «Тренер + время»: повтор той же отправки не создаст вторую Запись
  const idempotencyKey = useMemo(() => (trainerId && start ? crypto.randomUUID() : ""), [trainerId, start]);

  function load(id: string, keep?: { day: Day; start: string }) {
    setTrainerId(id);
    setData(null);
    setDay(keep?.day ?? null);
    setStart(keep?.start ?? null);
    startLoading(async () => {
      const r = await windowsAction(locale, id);
      setData(r);
      if (!keep) setDay(r.windows[0] ? zonedParts(new Date(r.windows[0].start)).day : null);
    });
  }

  // После «время заняли» и «Вы записаны» свободное время пересчитывается: занятое уйдёт из списка
  // «Вы записаны» — ещё и обновляем данные страницы: список текущих Записей для экрана лимита
  const router = useRouter();
  useEffect(() => {
    if ((state.status === "taken" || state.status === "ok") && state.trainerId) {
      const id = state.trainerId;
      startLoading(async () => setData(await windowsAction(locale, id)));
    }
    if (state.status === "ok") router.refresh();
  }, [state, locale, router]);

  if (result) {
    const back = () => {
      setDismissed(state);
      setStart(null);
    };
    if (result.status === "ok") {
      const s = new Date(result.start);
      return (
        <div className="pt-6 text-center">
          <IconHalo>
            <CheckSym className="h-10 w-10" />
          </IconHalo>
          <h1 className={`${h1} mt-6`}>{t.result.okTitle}</h1>
          <div className={`${card} mt-6 text-left`}>
            <p className="flex items-center gap-3 text-[19px] font-bold text-text-primary">
              <EventAvailableSym className="h-6 w-6 text-primary-container" />
              {fullWhen(s, new Date(result.end), t)}
            </p>
            <p className="mt-2 pl-9 text-body-lg text-text-muted">
              {trainers.find((tr) => tr.id === result.trainerId)?.name} · {halls.find((h) => h.id === hallId)?.name}
            </p>
          </div>
          <p className="mt-4 text-body-md text-text-muted">
            {fill(t.result.okNote, { deadline: deadlineText(new Date(s.getTime() - deadlineHours * 3_600_000), t), h: deadlineHours })}
          </p>
          <Link href={`/${locale}/cabinet`} className={`${btnPrimary} mt-8`}>
            {t.result.toBookings}
            <ArrowForwardSym className="h-6 w-6" />
          </Link>
          <button type="button" onClick={back} className={`${btnDark} mt-3 h-14`}>
            {t.result.more}
          </button>
        </div>
      );
    }
    if (result.status === "taken") {
      const s = result.start ? new Date(result.start) : null;
      const nearest = (data?.windows ?? [])
        .slice()
        .sort((a, b) => Math.abs(new Date(a.start).getTime() - (s?.getTime() ?? 0)) - Math.abs(new Date(b.start).getTime() - (s?.getTime() ?? 0)))
        .slice(0, 3)
        .sort((a, b) => a.start.localeCompare(b.start));
      return (
        <div className="pt-4 text-center">
          <IconHalo tone="amber">
            <ScheduleSym className="h-10 w-10" />
          </IconHalo>
          <h1 className={`${h1} mt-6`}>{t.result.takenTitle}</h1>
          <p className="mx-auto mt-3 max-w-md text-body-lg text-text-muted">{t.result.takenText}</p>
          {s && (
            <div className={`${card} mt-6 text-left`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-label-uppercase uppercase tracking-wider text-text-muted">{t.result.requested}</span>
                <Pill tone="danger">{t.result.takenBadge}</Pill>
              </div>
              <p className="mt-4 flex items-center gap-3 text-[19px] font-bold text-text-primary">
                <EventBusySym className="h-6 w-6 text-text-muted" />
                {fullWhen(s, new Date(s.getTime() + (data?.sessionMinutes ?? 60) * 60_000), t)}
              </p>
              <p className="mt-1 pl-9 text-body-md text-text-muted">
                {trainer?.name} · {halls.find((h) => h.id === hallId)?.name}
              </p>
            </div>
          )}
          {nearest.length > 0 && (
            <div className={`${card} mt-4 text-left`}>
              <p className="mb-2 text-label-uppercase uppercase tracking-wider text-text-primary">{t.result.nearest}</p>
              <ul>
                {nearest.map((w) => {
                  const d = zonedParts(new Date(w.start)).day;
                  return (
                    <li key={w.start}>
                      <button
                        type="button"
                        onClick={() => {
                          back();
                          setDay(d);
                          setStart(w.start);
                        }}
                        className="flex w-full items-center justify-between gap-3 py-4 text-left"
                      >
                        <span className="text-[19px] font-bold text-text-primary">{longDay(d, t)}</span>
                        <span className="flex items-center gap-2">
                          <span className="rounded-lg bg-primary-container/15 px-3 py-1.5 text-[19px] font-bold text-primary-container">{clock(new Date(w.start))}</span>
                          <ChevronRightSym className="h-6 w-6 text-text-muted" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <button type="button" onClick={back} className={`${btnPrimary} mt-6`}>
            {t.result.pickOther}
            <ArrowForwardSym className="h-6 w-6" />
          </button>
          <Link href={`/${locale}/cabinet`} className="mt-5 inline-block text-body-md text-text-muted underline-offset-4 hover:underline">
            {t.result.toBookings}
          </Link>
        </div>
      );
    }
    if (result.status === "limit") {
      return (
        <div className="pt-4 text-center">
          <IconHalo>
            <CalendarMonthSym className="h-8 w-8" />
            <span className="text-[13px] font-extrabold">
              {max} / {max}
            </span>
          </IconHalo>
          <Pill className="mt-5">{t.result.limitBadge}</Pill>
          <h1 className={`${h1} mt-4`}>{fill(t.result.limitTitle, { max })}</h1>
          <p className="mx-auto mt-3 max-w-md text-body-lg text-text-muted">{t.result.limitText}</p>
          <div className={`${card} mt-6 flex gap-4 text-left`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-primary-container">
              <ShieldSym className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[15px] font-extrabold uppercase tracking-wider text-text-primary">{t.result.rule}</p>
              <p className="mt-1 text-body-md text-text-muted">{fill(t.result.ruleText, { max })}</p>
            </div>
          </div>
          {upcoming.length > 0 && (
            <>
              <div className="mt-6 flex justify-between px-1">
                <span className="text-label-uppercase uppercase tracking-wider text-text-muted">{t.result.current}</span>
                <span className="text-body-md text-text-muted">{upcoming.length}</span>
              </div>
              <ul className="mt-3 space-y-3 text-left">
                {upcoming.map((u) => {
                  const s = new Date(u.start);
                  const d = zonedParts(s).day;
                  return (
                    <li key={u.start} className="flex items-center gap-4 rounded-2xl bg-surface-card p-4">
                      <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-surface-container-lowest py-2">
                        <span className="text-[13px] text-text-muted">{t.weekdays[weekdayOf(d) - 1]}</span>
                        <span className="text-[22px] font-extrabold text-text-primary">{Number(d.slice(8))}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[19px] font-bold text-text-primary">
                          {clock(s)} <span className="text-body-md font-normal text-text-muted">· {longDay(d, t).split(", ")[1]}</span>
                        </span>
                        <span className="block text-body-md text-text-muted">{u.trainer}</span>
                      </span>
                      <span className="rounded-md bg-surface-container-lowest px-3 py-1.5 text-[13px] font-extrabold uppercase tracking-wide text-primary-container">
                        {t.result.confirmed}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <Link href={`/${locale}/cabinet`} className={`${btnPrimary} mt-6`}>
            {t.result.toBookings}
            <ArrowForwardSym className="h-6 w-6" />
          </Link>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${btnDark} mt-3 h-14 normal-case`}>
            <ChatSym className="h-6 w-6 text-whatsapp-green" />
            {t.result.help}
          </a>
        </div>
      );
    }
  }

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="trainerId" value={trainerId ?? ""} />
      <input type="hidden" name="startAt" value={start ?? ""} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <h1 className={`${h1} flex items-center gap-3`}>
        <span aria-hidden="true" className="h-8 w-1.5 rounded-full bg-primary-container" />
        {t.book.title}
      </h1>
      <p className="mt-2 text-body-lg text-text-muted">{t.book.subtitle}</p>

      <div role="radiogroup" aria-label={t.book.title} className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-surface-card p-1.5">
        {halls.map((h) => {
          const on = h.id === hallId;
          return (
            <button
              key={h.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setHallId(h.id);
                setTrainerId(null);
                setData(null);
                setDay(null);
                setStart(null);
              }}
              className={`flex h-14 items-center justify-center gap-2 rounded-xl text-[17px] font-semibold transition ${
                on ? "bg-primary-container text-on-primary" : "text-text-primary hover:bg-surface-container-high"
              }`}
            >
              {h.id === "women" ? (
                on ? <FemaleSym className="h-5 w-5" /> : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#ff6fae]" />
              ) : (
                <ExerciseSym className="h-5 w-5" />
              )}
              {h.name}
            </button>
          );
        })}
      </div>

      <section className="mt-8">
        <StepTitle n={1} title={t.book.trainer} aside={fill(t.book.available, { n: hallTrainers.length })} />
        {hallTrainers.length === 0 ? (
          <p className={`${card} text-body-lg text-text-muted`}>{t.book.noTrainers}</p>
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-3 [scrollbar-width:none]">
            {hallTrainers.map((tr) => {
              const on = tr.id === trainerId;
              return (
                <button
                  key={tr.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => load(tr.id)}
                  className={`relative flex w-[42%] min-w-[150px] max-w-[200px] shrink-0 snap-start flex-col items-center gap-3 rounded-2xl border-2 bg-surface-card px-3 py-5 transition ${
                    on ? "border-primary-container" : "border-transparent hover:border-surface-border"
                  }`}
                >
                  {on && (
                    <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary">
                      <CheckSym className="h-5 w-5" />
                    </span>
                  )}
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high text-text-muted">
                    <PersonSym className="h-10 w-10" />
                  </span>
                  <span className={`text-center text-[17px] font-bold ${on ? "text-text-primary" : "text-text-muted"}`}>{tr.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <StepTitle n={2} title={t.book.date} aside={day ? `${t.monthsNom[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}` : undefined} />
        {!trainerId ? (
          <p className="text-body-md text-text-muted">{t.book.pickTrainer}</p>
        ) : loading && !data ? (
          <p className="text-body-md text-text-muted">{t.book.loading}</p>
        ) : data && data.windows.length === 0 ? (
          <p className={`${card} text-body-lg text-text-muted`}>{t.book.noWindows}</p>
        ) : (
          <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {days.map((d) => {
              const has = byDay.has(d);
              const on = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!has}
                  aria-pressed={on}
                  onClick={() => {
                    setDay(d);
                    setStart(null);
                  }}
                  className={`flex h-[5.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                    on ? "bg-primary-container text-on-primary" : has ? "bg-surface-card text-text-primary hover:bg-surface-container-high" : "text-text-muted/40"
                  }`}
                >
                  <span className={`text-[14px] ${on ? "font-bold" : ""}`}>{t.weekdays[weekdayOf(d) - 1]}</span>
                  <span className="text-[24px] font-bold leading-tight">{Number(d.slice(8))}</span>
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${on ? "bg-on-primary" : has ? "bg-whatsapp-green" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <StepTitle
          n={3}
          title={t.book.time}
          aside={
            data ? (
              <>
                <ScheduleSym className="h-5 w-5" />
                {fill(t.book.minutes, { n: data.sessionMinutes })}
              </>
            ) : undefined
          }
        />
        {day && byDay.get(day) ? (
          <>
            <div className="grid grid-cols-4 gap-2.5">
              {byDay.get(day)!.map((w) => {
                const on = w.start === start;
                return (
                  <button
                    key={w.start}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStart(w.start)}
                    className={`${chip} h-14 ${on ? "bg-primary-container text-on-primary" : "bg-surface-card text-text-primary hover:bg-surface-container-high"}`}
                  >
                    {clock(new Date(w.start))}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 flex items-center gap-2 text-body-md text-text-muted">
              <InfoSym className="h-5 w-5 text-primary-container" />
              {fill(t.book.duration, { n: data?.sessionMinutes ?? 60 })}
            </p>
          </>
        ) : (
          <p className="text-body-md text-text-muted">{trainerId && data && data.windows.length > 0 ? t.book.noWindowsDay : t.book.choose}</p>
        )}
      </section>

      {state.status === "error" && dismissed !== state && (
        <p role="alert" className="mt-6 rounded-xl bg-[#3a1416] px-4 py-3 text-body-md text-[#ff8a80]">
          {state.message}
        </p>
      )}

      <div className="sticky bottom-24 z-30 mt-8 overflow-hidden rounded-2xl border-t-4 border-primary-container bg-surface-card p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] md:bottom-6">
        {selected && trainer ? (
          <p className="flex items-start gap-3 text-[17px] font-bold text-text-primary">
            <CalendarMonthSym className="mt-0.5 h-6 w-6 shrink-0 text-primary-container" />
            <span>
              {longDay(zonedParts(new Date(selected.start)).day, t)} · {timeRange(new Date(selected.start), new Date(selected.end))} · {trainer.name} ·{" "}
              {halls.find((h) => h.id === hallId)?.name}
            </span>
          </p>
        ) : (
          <p className="text-[17px] font-bold text-text-muted">{t.book.choose}</p>
        )}
        <p className="mt-1 text-body-md text-text-muted">{t.book.pay}</p>
        <button type="submit" disabled={!selected || pending} className={`${btnPrimary} mt-4`}>
          {t.book.submit}
          <ArrowForwardSym className="h-6 w-6" />
        </button>
      </div>

      <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${waLink} mx-auto mt-8 flex w-fit text-body-md`}>
        <ChatSym className="h-5 w-5" />
        {t.result.help}
      </a>
    </form>
  );
}
