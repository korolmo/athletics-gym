"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { errorsKk } from "@/dictionaries/errors/kk";
import { errorsRu } from "@/dictionaries/errors/ru";
import { LocationOnSym } from "@/components/symbols";
import { Art500 } from "@/components/site/errors/ErrorArt";
import { ErrorActions, ErrorChip, ErrorHeading, ErrorShell, errorButton } from "@/components/site/errors/ErrorShell";
import { CopyCode, RetryButton } from "@/components/ui/ErrorControls";
import { site } from "@/lib/site";

// Страница 500 сайта: страница упала при отрисовке (обычно — не ответила база). Клиентский компонент — так требует Next.
// Скрипт этой страницы браузер получает на каждой странице сайта, поэтому здесь только тексты ошибок, без словаря целиком.
// Настроек сайта нет (база могла и упасть): вместо WhatsApp зала — его карточка в 2ГИС, где есть телефон и адрес.

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // С папкой pages/ (pages/500.tsx) хуки навигации типизированы как «может быть null»
  const locale = useParams<{ locale: string }>()?.locale === "kk" ? "kk" : "ru";
  const e = locale === "kk" ? errorsKk : errorsRu;
  const path = (usePathname() ?? "").replace(/^\/(ru|kk)(?=\/|$)/, "");

  return (
    <ErrorShell locale={locale} texts={e} path={path}>
      <title>{e.server.title}</title>
      <meta name="robots" content="noindex" />
      <ErrorChip>{e.server.chip}</ErrorChip>
      <Art500 />
      <ErrorHeading heading={e.server.heading} text={e.server.text} />
      <ErrorActions>
        <RetryButton reset={reset} label={e.server.retry} pending={e.server.retrying} className={errorButton.primary} />
        <Link href={`/${locale}`} prefetch={false} className={errorButton.secondary}>
          {e.home}
        </Link>
        <a href={site.twoGis} target="_blank" rel="noopener noreferrer" className={errorButton.secondary}>
          <LocationOnSym className="h-5 w-5 shrink-0 text-primary-container" />
          {e.contacts2gis}
        </a>
      </ErrorActions>

      {/* Код есть только у ошибок сервера: по нему ошибку находят в журнале (Plesk → Node.js → журнал, Sentry Лаборатории) */}
      {error.digest && (
        <div className="mt-8 w-full max-w-[34rem] rounded-2xl bg-surface-container p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-text-muted">{e.server.code}:</span>
            <CopyCode
              code={error.digest}
              copy={e.server.copy}
              copied={e.server.copied}
              className="flex min-h-9 items-center gap-2 rounded-md bg-surface-container-high px-3 py-1 text-body-sm text-primary-container transition-colors hover:text-text-primary"
            />
          </div>
          <p className="mt-2 text-body-sm text-text-muted">{e.server.codeHint}</p>
        </div>
      )}
    </ErrorShell>
  );
}
