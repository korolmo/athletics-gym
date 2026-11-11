import Link from "next/link";
import type { ReactNode } from "react";
import { ClubLogo } from "@/components/ui/ClubLogo";
import { getLogos } from "@/app/brand";
import type { Locale } from "@/lib/i18n";
import type { CabinetDictionary } from "@/dictionaries/cabinet/ru";
import { CalendarMonthSym, PersonSym } from "./icons";
import { ExerciseSym } from "./icons";

export type CabinetTab = "bookings" | "book" | "profile";

const TABS: { id: CabinetTab; path: string; Icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "bookings", path: "", Icon: CalendarMonthSym },
  { id: "book", path: "/book", Icon: ExerciseSym },
  { id: "profile", path: "/profile", Icon: PersonSym },
];

/**
 * Каркас страниц кабинета после входа (макеты 7–9, 15): шапка с логотипом, названием клуба и страницы и кнопкой
 * профиля; на телефоне — нижняя панель вкладок, с планшета — вкладки в шапке. Содержимое — колонкой до 720 px.
 */
export async function CabinetShell({ locale, t, tab, children }: { locale: Locale; t: CabinetDictionary; tab: CabinetTab; children: ReactNode }) {
  // Логотип Клуба (этап П1): картинка или монограмма
  const logos = await getLogos();
  const base = `/${locale}/cabinet`;
  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header data-cabinet-header className="sticky top-0 z-40 w-full bg-background/95 shadow-header md:bg-background/85 md:backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center justify-between gap-3 px-4 md:h-20 md:px-gutter">
          <Link href={`/${locale}`} className="flex min-w-0 items-center gap-3">
            <ClubLogo logo={logos.club} size={36} className="h-9 w-9 shrink-0 object-contain" priority />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-label-uppercase uppercase tracking-widest text-primary-container">{t.brand.name}</span>
              <span className="truncate text-[19px] font-extrabold uppercase text-text-primary">{t.header[tab]}</span>
            </span>
          </Link>
          <nav aria-label={t.header[tab]} className="hidden items-center gap-1 md:flex">
            {TABS.map(({ id, path }) => (
              <Link
                key={id}
                href={`${base}${path}`}
                aria-current={id === tab ? "page" : undefined}
                className={`rounded-xl px-4 py-2.5 text-[14px] font-bold uppercase tracking-wide transition ${
                  id === tab ? "bg-primary-container text-on-primary" : "text-text-muted hover:text-text-primary"
                }`}
              >
                {t.nav[id]}
              </Link>
            ))}
          </nav>
          <Link
            href={`${base}/profile`}
            aria-label={t.nav.profile}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-text-primary text-background transition hover:brightness-90"
          >
            <PersonSym className="h-6 w-6" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-4 pt-4 md:px-gutter md:pt-8">{children}</main>

      <nav aria-label={t.header[tab]} className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-surface-container-lowest md:hidden">
        <div className="mx-auto grid max-w-[720px] grid-cols-3 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ id, path, Icon }) => (
            <Link
              key={id}
              href={`${base}${path}`}
              aria-current={id === tab ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-3 text-[13px] font-bold ${id === tab ? "text-primary-container" : "text-text-muted"}`}
            >
              <Icon className="h-7 w-7" />
              {t.nav[id]}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
