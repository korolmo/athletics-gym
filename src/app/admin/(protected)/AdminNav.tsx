"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Обращения" },
  { href: "/admin/tariffs", label: "Тарифы" },
  { href: "/admin/trainers", label: "Тренеры" },
  { href: "/admin/photos", label: "Фото" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/site", label: "Сайт" },
  { href: "/admin/account", label: "Аккаунт" },
];

export function AdminNav({ newReviews = 0 }: { /** Сколько Отзывов ждут решения Владельца */ newReviews?: number }) {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2 text-sm [&>a]:shrink-0 [&>a]:whitespace-nowrap">
      {items.map((item) => {
        // «/admin» — главная: активна только на самой себе, иначе была бы подсвечена всегда
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
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
            {item.href === "/admin/reviews" && newReviews > 0 && (
              <span
                aria-label={`новых: ${newReviews}`}
                className={`ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  active ? "bg-accent-ink text-accent" : "bg-accent text-accent-ink"
                }`}
              >
                {newReviews}
              </span>
            )}
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
