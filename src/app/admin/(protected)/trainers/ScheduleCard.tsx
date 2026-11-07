"use client";

import { useActionState, useState } from "react";
import { formatClock } from "@/lib/time";
import { MAX_INTERVALS_PER_DAY, SESSION_MINUTES_MAX, SESSION_MINUTES_MIN, SESSION_MINUTES_STEP, type WorkInterval } from "@/modules/schedule/client";
import { addTimeOffAction, deleteTimeOffAction, saveWorkWeekAction, type ScheduleFormState } from "./schedule-actions";

/** Что карточке нужно от модуля Окна Тренера; даты исключений уже подписаны сервером («15 ноября»). */
export type ScheduleForAdminView = {
  sessionMinutes: number;
  workHours: WorkInterval[];
  timeOff: { id: string; fromDay: string; toDay: string; note: string | null; label: { from: string; to: string } }[];
};

// Часы работы и исключения Тренера — по макету 18 (design/stitch/cabinet), в стиле админки.

const DAYS = [
  ["ПН", "Понедельник"],
  ["ВТ", "Вторник"],
  ["СР", "Среда"],
  ["ЧТ", "Четверг"],
  ["ПТ", "Пятница"],
  ["СБ", "Суббота"],
  ["ВС", "Воскресенье"],
] as const;

type Interval = { start: string; end: string };

const timeInput = "w-24 rounded-lg border border-line bg-bg px-2 py-1.5 text-center text-sm tabular-nums outline-none focus:border-accent";

function Status({ state }: { state: ScheduleFormState }) {
  if (state?.error)
    return (
      <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="mt-4 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
        Сохранено — свободное время в кабинете уже пересчитано
      </p>
    );
  return null;
}

export function ScheduleCard({ trainerId, schedule }: { trainerId: string; schedule: ScheduleForAdminView }) {
  const [minutes, setMinutes] = useState(schedule.sessionMinutes);
  const [week, setWeek] = useState<{ on: boolean; intervals: Interval[] }[]>(() =>
    DAYS.map((_, i) => {
      const intervals = schedule.workHours
        .filter((w) => w.weekday === i + 1)
        .map((w) => ({ start: formatClock(w.startMin), end: formatClock(w.endMin) }));
      return { on: intervals.length > 0, intervals: intervals.length ? intervals : [{ start: "09:00", end: "13:00" }] };
    }),
  );
  const [weekState, weekAction, savingWeek] = useActionState(saveWorkWeekAction, undefined);
  const [offState, offAction, savingOff] = useActionState(addTimeOffAction, undefined);

  const update = (d: number, fn: (day: { on: boolean; intervals: Interval[] }) => { on: boolean; intervals: Interval[] }) =>
    setWeek((w) => w.map((day, i) => (i === d ? fn(day) : day)));

  return (
    <section className="mt-10 border-t border-line pt-6">
      <form action={weekAction} className="rounded-2xl bg-card p-5">
        <input type="hidden" name="trainerId" value={trainerId} />
        <input type="hidden" name="sessionMinutes" value={minutes} />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide">Часы работы</h2>
          <span className="text-sm text-muted">{week.filter((d) => d.on).length} дн.</span>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-bg px-4 py-3">
          <div>
            <p className="text-xs text-muted">Длительность тренировки</p>
            <p className="font-semibold">{minutes} минут</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Короче на 15 минут"
              disabled={minutes <= SESSION_MINUTES_MIN}
              onClick={() => setMinutes((m) => m - SESSION_MINUTES_STEP)}
              className="h-9 w-9 rounded-lg border border-line text-lg disabled:opacity-40"
            >
              −
            </button>
            <span className="w-12 text-center font-semibold text-accent">{minutes}м</span>
            <button
              type="button"
              aria-label="Длиннее на 15 минут"
              disabled={minutes >= SESSION_MINUTES_MAX}
              onClick={() => setMinutes((m) => m + SESSION_MINUTES_STEP)}
              className="h-9 w-9 rounded-lg border border-line text-lg disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {DAYS.map(([short, long], d) => {
            const day = week[d];
            const weekday = d + 1;
            return (
              <li key={short} className="py-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className={`w-7 text-sm font-semibold ${day.on ? "text-accent" : "text-muted"}`}>{short}</span>
                    <span className={day.on ? "" : "text-muted"}>{long}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={day.on}
                    onChange={(e) => update(d, (x) => ({ ...x, on: e.target.checked }))}
                    className="h-6 w-11 cursor-pointer appearance-none rounded-full bg-line transition before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-muted before:transition checked:bg-accent checked:before:translate-x-[1.35rem] checked:before:bg-accent-ink"
                    aria-label={`${long}: рабочий день`}
                  />
                </label>
                {day.on ? (
                  <div className="mt-3 space-y-2 pl-10">
                    {day.intervals.map((iv, n) => (
                      <div key={n} className="flex items-center gap-2">
                        <input
                          name={`start-${weekday}-${n}`}
                          value={iv.start}
                          onChange={(e) => update(d, (x) => ({ ...x, intervals: x.intervals.map((v, k) => (k === n ? { ...v, start: e.target.value } : v)) }))}
                          aria-label={`${long}, интервал ${n + 1}: начало`}
                          inputMode="numeric"
                          placeholder="09:00"
                          className={timeInput}
                        />
                        <span className="text-muted">—</span>
                        <input
                          name={`end-${weekday}-${n}`}
                          value={iv.end}
                          onChange={(e) => update(d, (x) => ({ ...x, intervals: x.intervals.map((v, k) => (k === n ? { ...v, end: e.target.value } : v)) }))}
                          aria-label={`${long}, интервал ${n + 1}: конец`}
                          inputMode="numeric"
                          placeholder="13:00"
                          className={timeInput}
                        />
                        <button
                          type="button"
                          aria-label="Убрать интервал"
                          onClick={() =>
                            update(d, (x) => (x.intervals.length > 1 ? { ...x, intervals: x.intervals.filter((_, k) => k !== n) } : { ...x, on: false }))
                          }
                          className="ml-auto px-2 text-lg text-muted hover:text-fg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {day.intervals.length < MAX_INTERVALS_PER_DAY && (
                      <button
                        type="button"
                        onClick={() => update(d, (x) => ({ ...x, intervals: [...x.intervals, { start: "", end: "" }] }))}
                        className="text-xs font-semibold uppercase tracking-wide text-accent"
                      >
                        + ещё интервал
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <input type="hidden" name={`off-${weekday}`} value="on" />
                    <p className="mt-2 pl-10 text-xs uppercase tracking-wide text-muted">Выходной день</p>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <Status state={weekState} />
        <button type="submit" disabled={savingWeek} className="mt-5 w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-ink disabled:opacity-60">
          {savingWeek ? "Сохраняем…" : "Сохранить часы работы"}
        </button>
      </form>

      <div className="mt-4 rounded-2xl bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide">Исключения</h2>
          <span className="text-sm text-accent">{schedule.timeOff.length}</span>
        </div>
        {schedule.timeOff.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Выходных и отпусков впереди нет.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {schedule.timeOff.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-semibold">{t.fromDay === t.toDay ? t.label.from : `${t.label.from} — ${t.label.to}`}</span>
                  {t.note && <span className="block text-sm text-muted">{t.note}</span>}
                </span>
                <form action={deleteTimeOffAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="trainerId" value={trainerId} />
                  <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-danger">
                    Удалить
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={offAction} className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <input type="hidden" name="trainerId" value={trainerId} />
          <label className="text-sm">
            <span className="mb-1 block text-muted">С</span>
            <input type="date" name="fromDay" required className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">По (необязательно)</span>
            <input type="date" name="toDay" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
          </label>
          <label className="col-span-2 text-sm">
            <span className="mb-1 block text-muted">Подпись</span>
            <input name="note" maxLength={60} placeholder="Отпуск, выходной" className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
          </label>
          <div className="col-span-2">
            <Status state={offState} />
            <button type="submit" disabled={savingOff} className="mt-2 w-full rounded-xl border border-accent py-3 font-semibold text-accent disabled:opacity-60">
              + Добавить исключение
            </button>
          </div>
        </form>
        <p className="mt-4 text-sm text-muted">Свободные окна считаются сами: часы работы минус исключения и уже сделанные записи.</p>
      </div>
    </section>
  );
}
