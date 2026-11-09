"use client";

import Link from "next/link";

// Меню разделов — в AdminShell.tsx (новая админка). Здесь — общий переключатель Зала для списков,
// по макетам новой админки (жёлтая плашка у выбранного, значок Женского зала — розовая точка).

/** Переключатель Зала для списков админки. `base` может уже содержать параметры (?day=…). */
export function HallFilter({ base, hall }: { base: string; hall: string }) {
  const halls = [
    { id: "general", label: "Общий зал" },
    { id: "women", label: "Женский зал" },
  ];
  return (
    <div role="tablist" aria-label="Зал" className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-card p-1.5">
      {halls.map((h) => {
        const on = h.id === hall;
        return (
          <Link
            key={h.id}
            href={`${base}${base.includes("?") ? "&" : "?"}hall=${h.id}`}
            role="tab"
            aria-selected={on}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl font-semibold transition ${
              on ? "bg-accent text-accent-ink" : "text-muted hover:text-fg"
            }`}
          >
            {h.id === "women" && !on && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#ff6fae]" />}
            {h.label}
          </Link>
        );
      })}
    </div>
  );
}
