"use client";

import Link from "next/link";

// Меню разделов — в AdminShell.tsx (новая админка). Здесь — общий фильтр по Залу для списков.

/** Фильтр по Залу для списков админки. */
export function HallFilter({ base, hall }: { base: string; hall: string }) {
  const halls = [
    { id: "general", label: "Общий зал" },
    { id: "women", label: "Женский зал" },
  ];
  return (
    <div role="tablist" aria-label="Зал" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-card p-1">
      {halls.map((h) => (
        <Link
          key={h.id}
          href={`${base}${base.includes("?") ? "&" : "?"}hall=${h.id}`}
          role="tab"
          aria-selected={h.id === hall}
          className={
            h.id === hall
              ? "rounded-lg bg-accent py-2.5 text-center font-semibold text-accent-ink"
              : "rounded-lg py-2.5 text-center font-semibold text-muted hover:text-fg"
          }
        >
          {h.label}
        </Link>
      ))}
    </div>
  );
}
