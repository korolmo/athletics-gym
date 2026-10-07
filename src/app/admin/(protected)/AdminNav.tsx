"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/tariffs", label: "Тарифы" },
  { href: "/admin/trainers", label: "Тренеры" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-lg bg-accent px-3 py-1.5 font-semibold text-accent-ink"
                : "rounded-lg px-3 py-1.5 text-muted hover:text-fg"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
          href={`${base}?hall=${h.id}`}
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
