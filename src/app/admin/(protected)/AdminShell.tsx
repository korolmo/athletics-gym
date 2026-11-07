"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { logo } from "@/lib/brand";
import { logout } from "../actions";
import {
  AdsClickSym,
  CalendarMonthSym,
  CategorySym,
  CloseSym,
  ExerciseSym,
  LogoutSym,
  MoreHorizSym,
  OpenInNewSym,
  PaymentsSym,
  PersonSym,
  PhotoLibrarySym,
  ReviewsSym,
  WebSym,
} from "./nav-icons";

// Оболочка новой админки (docs/stages/admin-v2.md, решения 24–25; макет 17): на компьютере — шапка и боковое меню
// со всеми разделами, на телефоне — шапка с названием раздела и нижние вкладки «Записи · Обращения · Тренеры · Ещё».

type Section = { href: string; label: string; Icon: (p: { className?: string }) => ReactNode };

const SECTIONS: Section[] = [
  { href: "/admin", label: "Обращения", Icon: AdsClickSym },
  { href: "/admin/bookings", label: "Записи", Icon: CalendarMonthSym },
  { href: "/admin/tariffs", label: "Тарифы", Icon: PaymentsSym },
  { href: "/admin/trainers", label: "Тренеры", Icon: ExerciseSym },
  { href: "/admin/directions", label: "Направления", Icon: CategorySym },
  { href: "/admin/photos", label: "Фото", Icon: PhotoLibrarySym },
  { href: "/admin/reviews", label: "Отзывы", Icon: ReviewsSym },
  { href: "/admin/site", label: "Сайт", Icon: WebSym },
  { href: "/admin/account", label: "Аккаунт", Icon: PersonSym },
];

/** Нижние вкладки на телефоне; остальные разделы — в листе «Ещё». */
const TABS = ["/admin/bookings", "/admin", "/admin/trainers"];

/** «/admin» — Обращения: активен только на самой главной, иначе подсвечивался бы всегда. */
function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ n, on }: { n: number; on?: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`новых: ${n}`}
      className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${on ? "bg-accent-ink text-accent" : "bg-accent text-accent-ink"}`}
    >
      {n}
    </span>
  );
}

export function AdminShell({ newReviews, children }: { /** Сколько Отзывов ждут решения */ newReviews: number; children: ReactNode }) {
  // С папкой pages/ (pages/500.tsx) хук типизирован как «может быть null»
  const pathname = usePathname() ?? "";
  const more = useRef<HTMLDialogElement>(null);
  const current = SECTIONS.find((s) => isActive(pathname, s.href));
  const badgeFor = (href: string) => (href === "/admin/reviews" ? newReviews : 0);
  const inMore = SECTIONS.filter((s) => !TABS.includes(s.href));
  const moreActive = inMore.some((s) => isActive(pathname, s.href));

  return (
    <div className="min-h-dvh">
      <header data-admin-header className="sticky top-0 z-40 border-b border-line bg-bg/95 md:backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:h-[72px] lg:px-6">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <Image src={logo} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-xs font-extrabold uppercase tracking-widest text-accent">Athletic&apos;s · Admin</span>
              <span className="truncate text-lg font-bold lg:hidden">{current?.label ?? "Админка"}</span>
              <span className="hidden text-lg font-bold lg:block">Админка</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="/ru" target="_blank" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted hover:text-fg sm:flex">
              Сайт <OpenInNewSym className="h-4 w-4" />
            </a>
            <Link
              href="/admin/account"
              aria-label="Аккаунт"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-fg text-bg transition hover:brightness-90"
            >
              <PersonSym className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:flex">
        <aside className="hidden w-64 shrink-0 border-r border-line lg:block">
          <nav aria-label="Разделы" className="sticky top-[72px] flex h-[calc(100dvh-72px)] flex-col gap-1 p-4">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-muted">Управление клубом</p>
            {SECTIONS.map(({ href, label, Icon }) => {
              const on = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition ${on ? "bg-accent text-accent-ink" : "text-muted hover:bg-card hover:text-fg"}`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  <Badge n={badgeFor(href)} on={on} />
                </Link>
              );
            })}
            <form action={logout} className="mt-auto">
              <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-semibold text-muted hover:bg-card hover:text-danger">
                <LogoutSym className="h-5 w-5" />
                Выйти
              </button>
            </form>
          </nav>
        </aside>

        {/* Ширина колонки — прежняя (3xl): разделы ещё свёрстаны под узкую колонку; широкие появятся с их макетами */}
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 lg:pb-12">{children}</main>
      </div>

      <nav aria-label="Разделы" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg lg:hidden">
        <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((href) => {
            const s = SECTIONS.find((x) => x.href === href)!;
            const on = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${on ? "text-accent" : "text-muted"}`}
              >
                <s.Icon className="h-6 w-6" />
                {s.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => more.current?.showModal()}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${moreActive ? "text-accent" : "text-muted"}`}
          >
            <MoreHorizSym className="h-6 w-6" />
            Ещё
            {newReviews > 0 && <span aria-hidden="true" className="absolute right-[30%] top-2 h-2.5 w-2.5 rounded-full bg-accent" />}
          </button>
        </div>
      </nav>

      <dialog
        ref={more}
        aria-label="Другие разделы"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-card p-0 text-fg backdrop:bg-black/70 lg:hidden"
      >
        <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span aria-hidden="true" className="mx-auto h-1.5 w-12 rounded-full bg-line" />
            <button type="button" onClick={() => more.current?.close()} aria-label="Закрыть" className="absolute right-3 top-3 rounded-full p-2 text-muted">
              <CloseSym className="h-6 w-6" />
            </button>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {inMore.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => more.current?.close()}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={`flex items-center gap-4 py-4 text-lg font-semibold ${isActive(pathname, href) ? "text-accent" : ""}`}
                >
                  <Icon className="h-6 w-6 text-muted" />
                  {label}
                  <Badge n={badgeFor(href)} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-line pt-2">
            <a href="/ru" target="_blank" className="flex items-center gap-4 py-4 text-lg font-semibold">
              <OpenInNewSym className="h-6 w-6 text-muted" />
              Открыть сайт
            </a>
            <form action={logout}>
              <button type="submit" className="flex w-full items-center gap-4 py-4 text-lg font-semibold text-danger">
                <LogoutSym className="h-6 w-6" />
                Выйти
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
