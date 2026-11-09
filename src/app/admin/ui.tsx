// Набор элементов новой админки (docs/stages/admin-v2.md) — по макетам Stitch в design/stitch/admin: карточки #1F1F23
// с рамкой, жёлтый — только главное действие и активное, Onest. Только классы и простые обёртки без состояния:
// годятся и серверным страницам, и клиентским формам.
import type { ReactNode } from "react";

export const card = "rounded-2xl border border-line bg-card p-5";
export const label = "mb-2 block text-sm font-semibold text-muted";
export const hint = "mt-1.5 block text-xs text-muted";
export const field =
  "h-12 w-full rounded-xl border border-line bg-bg px-4 text-base text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";
export const textarea =
  "min-h-28 w-full rounded-xl border border-line bg-bg px-4 py-3 text-base text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";
export const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-bold uppercase tracking-wide text-accent-ink transition hover:brightness-95 active:translate-y-px disabled:opacity-60";
export const btnDark =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-card-2 px-5 font-semibold text-fg transition hover:bg-line disabled:opacity-60";
export const btnDangerText = "inline-flex items-center justify-center gap-2 px-3 py-2 font-semibold text-danger transition hover:brightness-110";
/** Переключатель «На сайте» — обычный checkbox с видом тумблера */
export const toggle =
  "relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition before:absolute before:left-1 before:top-1 before:h-5 before:w-5 before:rounded-full before:bg-muted before:transition checked:bg-accent checked:before:translate-x-5 checked:before:bg-accent-ink";

/** Заголовок раздела: «Обращения» + подзаголовок, справа — действие или статус. */
export function PageHead({ title, subtitle, aside }: { title: string; subtitle?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Заголовок карточки: иконка жёлтым, название, справа — счётчик или подпись. */
export function CardTitle({ icon, title, aside }: { icon?: ReactNode; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-lg font-bold">
        {icon && <span className="text-accent">{icon}</span>}
        {title}
      </h2>
      {aside && <span className="text-xs font-bold uppercase tracking-wider text-muted">{aside}</span>}
    </div>
  );
}

/** Плашка-статус с точкой: «● На сайте», «● Новый». */
export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "ok" | "danger" }) {
  const colors = {
    muted: "bg-card-2 text-muted",
    accent: "bg-accent/15 text-accent",
    ok: "bg-wa/15 text-wa",
    danger: "bg-danger/15 text-danger",
  }[tone];
  const dot = { muted: "bg-muted", accent: "bg-accent", ok: "bg-wa", danger: "bg-danger" }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${colors}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

/** Пустое состояние: пунктирная рамка и текст. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

/** Сообщение после сохранения: зелёное «Сохранено — уже на сайте» или красная ошибка. */
export function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${tone === "ok" ? "border-wa/40 bg-wa/10 text-wa" : "border-danger/40 bg-danger/10 text-danger"}`}
    >
      {children}
    </p>
  );
}
