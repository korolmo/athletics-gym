"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertIcon, GridIcon, SearchIcon } from "@/components/icons";
import { CopyCode, RetryButton } from "@/components/ui/ErrorControls";

// Страницы ошибок админки — по макетам Stitch «Админка — Раздел не найден (404)» и «Ошибка загрузки раздела»,
// в стиле админки (Oswald + Inter, её цвета). Админка только на русском — тексты здесь, не в словарях сайта.

const primary =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-semibold uppercase tracking-wide text-accent-ink transition hover:brightness-95 active:translate-y-px disabled:opacity-70";
const secondary =
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-card-2 px-4 text-sm font-semibold uppercase tracking-wide text-fg transition-colors hover:text-accent";

function Card({ chip, icon, title, text, children }: { chip: string; icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-6">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-danger motion-safe:animate-pulse" />
        {chip}
      </p>
      <div className="relative overflow-hidden rounded-2xl bg-card p-6 text-center shadow-xl">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-75" />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-bg text-accent ring-8 ring-accent/10">{icon}</div>
        <h1 className="font-display text-2xl uppercase tracking-wide">{title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">{text}</p>
        <div className="mt-6 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

const toSections = (
  <Link href="/admin" className={secondary}>
    <GridIcon className="h-4 w-4" />К разделам
  </Link>
);

/** 404 админки: неизвестный адрес или удалённая запись (Тариф, Тренер, Фото…). */
export function AdminNotFoundCard() {
  const pathname = usePathname() ?? "";
  return (
    <Card chip="Ошибка 404" icon={<SearchIcon className="h-8 w-8" />} title="Раздел не найден" text="Возможно, запись удалили, раздел переименовали или в адресе опечатка.">
      <p className="mb-2 truncate rounded-lg bg-bg px-3 py-2 font-mono text-xs text-muted" title={pathname}>
        {pathname}
      </p>
      <Link href="/admin" className={primary}>
        <GridIcon className="h-5 w-5" />К разделам админки
      </Link>
    </Card>
  );
}

/** Ошибка при открытии раздела: сохранённое в базе на месте, код ошибки — для разработчика. */
export function AdminErrorCard({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card
      chip="Ошибка 500"
      icon={<AlertIcon className="h-8 w-8" />}
      title="Не удалось загрузить раздел"
      text="Сохранённые данные на месте. Попробуйте ещё раз; если ошибка повторится — сообщите код разработчику."
    >
      {error.digest && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-bg p-2 pl-3 text-left">
          <span className="text-xs uppercase tracking-wide text-muted">Код ошибки</span>
          <CopyCode
            code={error.digest}
            copy="Скопировать код"
            copied="Скопировано"
            className="flex min-h-9 items-center gap-2 rounded-lg bg-card-2 px-3 py-1 text-sm text-fg transition-colors hover:text-accent"
          />
        </div>
      )}
      <RetryButton reset={reset} label="Попробовать снова" pending="Обновляем…" className={primary} />
      {toSections}
    </Card>
  );
}
