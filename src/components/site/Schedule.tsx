"use client";

import { useEffect, useState } from "react";

export type LessonView = {
  id: string;
  weekday: number;
  startTime: string;
  durationMin: number;
  discipline: string;
  trainer: string | null;
};

type Labels = { weekdaysShort: string[]; empty: string; min: string };

export function Schedule({ lessons, labels }: { lessons: LessonView[]; labels: Labels }) {
  const [day, setDay] = useState(1);

  useEffect(() => {
    const today = new Date().getDay();
    setDay(today === 0 ? 7 : today);
  }, []);

  const items = lessons
    .filter((l) => l.weekday === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <div role="tablist" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {labels.weekdaysShort.map((label, i) => {
          const n = i + 1;
          const active = n === day;
          return (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDay(n)}
              className={`min-w-12 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active ? "bg-accent text-accent-ink" : "bg-card text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {items.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-line p-6 text-center text-muted md:col-span-2">
            {labels.empty}
          </li>
        ) : (
          items.map((l) => (
            <li key={l.id} className="flex items-center gap-4 rounded-2xl bg-card p-4">
              <div className="w-20 shrink-0">
                <div className="font-display text-2xl leading-none text-accent">{l.startTime}</div>
                <div className="mt-1 text-xs text-muted">
                  {l.durationMin} {labels.min}
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold">{l.discipline}</div>
                {l.trainer && <div className="truncate text-sm text-muted">{l.trainer}</div>}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
