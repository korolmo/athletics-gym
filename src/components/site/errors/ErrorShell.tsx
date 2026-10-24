import Image from "next/image";
import Link from "next/link";
import type { ErrorTexts } from "@/dictionaries/errors/ru";
import type { Locale } from "@/lib/i18n";
import { logo } from "@/lib/brand";
import { site } from "@/lib/site";
import { container, label } from "@/components/ui/styles";

// Страница ошибки сайта (404, app/global-not-found.tsx) — по макетам Stitch (проект 4810510334939218653).
// Без хуков и без базы: при упавшей базе страницы ошибок всё равно рисуются.
// Шапка короче, чем на главной: логотип и язык, без меню по Блокам.

const locales: Locale[] = ["ru", "kk"];

export const errorButton = {
  primary:
    "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-6 py-2 text-[15px] font-extrabold uppercase leading-5 tracking-wide text-on-primary shadow-md transition-all hover:brightness-95 active:translate-y-px disabled:opacity-70",
  secondary:
    "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-surface-card px-6 py-2 text-[15px] font-bold uppercase leading-5 tracking-wide text-text-primary shadow-xs transition-colors hover:text-primary-container",
  whatsapp:
    "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-green px-6 py-2 text-[15px] font-extrabold uppercase leading-5 tracking-wide text-on-whatsapp shadow-md transition-all hover:brightness-95 active:translate-y-px",
};

export function ErrorShell({
  locale,
  texts,
  path = "",
  children,
}: {
  locale: Locale;
  texts: ErrorTexts;
  /** Путь внутри языка («/abc»): переключатель языка ведёт на него же; пусто — на главную */
  path?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header data-site-header className="fixed inset-x-0 top-0 z-50 w-full bg-background/95 shadow-header md:bg-background/85 md:backdrop-blur-xl">
        <div className={`${container} flex h-16 items-center justify-between gap-3 md:h-20`}>
          <Link href={`/${locale}`} prefetch={false} className="flex min-w-0 items-center gap-2 md:gap-4">
            <Image src={logo} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" priority />
            <span className="whitespace-nowrap text-[15px] font-bold uppercase leading-6 tracking-wide text-text-primary md:text-headline-sm md:tracking-wider">
              {site.name}
            </span>
          </Link>
          <div className={`${label} flex items-center gap-1 text-text-muted`}>
            {locales.map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">|</span>}
                <Link
                  href={`/${l}${path}`}
                  prefetch={false}
                  hrefLang={l}
                  aria-current={l === locale ? "page" : undefined}
                  className={l === locale ? "px-0.5 py-2 text-primary-container" : "px-0.5 py-2 transition-colors hover:text-text-primary"}
                >
                  {texts.lang[l]}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </header>
      <main className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-surface-container-lowest pt-16 md:pt-20">
        {/* Свечение — градиентом, без filter: blur (на телефоне размытие пересчитывается при прокрутке) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(ellipse_at_50%_35%,rgb(245_230_66/0.08),transparent_60%)]"
        />
        <div className={`${container} relative flex flex-1 flex-col items-center justify-center py-10 text-center md:py-16`}>{children}</div>
      </main>
      <footer className="w-full border-t border-surface-border bg-surface-container-lowest py-6">
        <p className={`${container} text-center text-body-sm text-text-muted`}>
          © {new Date().getFullYear()} {site.name} · Кызылорда
        </p>
      </footer>
    </>
  );
}

/** Плашка над рисунком: «Ошибка 404» и т. п. */
export function ErrorChip({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${label} mb-6 inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-1.5 tracking-wider text-text-primary`}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary-container motion-safe:animate-pulse" />
      {children}
    </p>
  );
}

export function ErrorHeading({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="mt-4 flex max-w-[36rem] flex-col items-center">
      <h1 className="text-headline-lg-mobile uppercase text-text-primary md:text-headline-lg">{heading}</h1>
      <p className="mt-3 max-w-[30rem] text-body-lg text-text-muted">{text}</p>
    </div>
  );
}

/** Кнопки: на телефоне столбиком во всю ширину, с планшета — в ряд. */
export function ErrorActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 flex w-full max-w-[40rem] flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:[&>*]:min-w-[14rem] sm:[&>*]:flex-1">{children}</div>;
}
