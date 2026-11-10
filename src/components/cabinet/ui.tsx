// Общие элементы кабинета Клиента — по макетам Stitch (design/stitch/cabinet): те же токены, что у сайта.
import type { ReactNode } from "react";

export const card = "rounded-2xl bg-surface-card p-5 md:p-6";
export const cardLine = "rounded-2xl border border-surface-border bg-surface-card p-5 md:p-6";
export const fieldLabel = "text-label-uppercase uppercase tracking-wider text-text-muted";
export const input =
  "h-14 w-full rounded-xl border border-surface-border bg-surface-container-lowest px-4 text-body-lg text-text-primary outline-none transition placeholder:text-text-muted/70 focus:border-primary-container";
export const btnPrimary =
  "inline-flex h-14 w-full items-center justify-center gap-3 whitespace-nowrap rounded-xl bg-primary-container px-4 text-[15px] font-extrabold uppercase tracking-wide sm:px-6 sm:text-[17px] sm:tracking-wider text-on-primary transition hover:brightness-95 active:translate-y-px disabled:opacity-60";
export const btnDark =
  "inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-surface-container-high px-5 text-[15px] font-bold uppercase tracking-wide text-text-primary transition hover:bg-surface-border disabled:opacity-60";
export const h1 = "text-headline-lg-mobile font-extrabold uppercase text-text-primary md:text-headline-lg";
export const waLink = "inline-flex items-center gap-2 font-semibold text-whatsapp-green transition hover:brightness-110";

/** Плашка с точкой: «• ATHLETIC CLUB ID». */
export function Pill({
  children,
  tone = "accent",
  small = false,
  className = "",
}: {
  children: ReactNode;
  tone?: "accent" | "danger";
  /** Мельче на телефоне — для длинной надписи, которая иначе переносится */
  small?: boolean;
  className?: string;
}) {
  const colors = tone === "danger" ? "bg-[#3a1416] text-[#ff8a80]" : "bg-surface-container-high text-primary-container";
  const dot = tone === "danger" ? "bg-[#ef4444]" : "bg-primary-container";
  const size = small ? "px-3 text-[11px] font-extrabold sm:px-4 sm:text-label-uppercase" : "px-4 text-label-uppercase";
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full py-1.5 uppercase tracking-wider ${size} ${colors} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

/** Заголовок шага записи: «① ВЫБЕРИТЕ ТРЕНЕРА … 4 доступны». */
export function StepTitle({ n, title, aside }: { n: number; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 text-[15px] font-extrabold uppercase tracking-wider text-text-primary">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-high text-[13px] text-primary-container">{n}</span>
        {title}
      </h2>
      {aside && <span className="flex items-center gap-1.5 text-body-md text-text-muted">{aside}</span>}
    </div>
  );
}

/** Иконка в круге — шапка экранов результата и пустого состояния. */
export function IconHalo({ children, tone = "accent", className = "" }: { children: ReactNode; tone?: "accent" | "amber" | "danger"; className?: string }) {
  const ring = { accent: "bg-primary-container/10 text-primary-container", amber: "bg-[#f5a623]/15 text-[#f5a623]", danger: "bg-[#ef4444]/20 text-white" }[tone];
  const inner = { accent: "bg-primary-container/15", amber: "bg-[#f5a623]/25", danger: "bg-[#ef4444]" }[tone];
  return (
    <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full ${ring} ${className}`}>
      <div className={`flex h-20 w-20 flex-col items-center justify-center rounded-full ${inner}`}>{children}</div>
    </div>
  );
}
