"use client";

import { useRef } from "react";
import { cancelBookingByOwnerAction } from "./actions";
import { Chip } from "../../ui";
import { CloseSym } from "../nav-icons";

// Запись в колонке Тренера и её карточка — по макетам 16 (снизу на телефоне) и 17 (колонки на компьютере).
// Нажатие на Запись открывает карточку: WhatsApp Клиенту и отмена. Нативный dialog — фокус и Esc даёт браузер.

export type BookingItemView = {
  id: string;
  time: string;
  status: "active" | "past" | "cancelledByClient" | "cancelledByOwner";
  clientName: string;
  phoneMasked: string | null;
  whatsapp: string | null;
  trainerName: string;
  hallName: string;
  dayLabel: string;
};

const STATUS: Record<BookingItemView["status"], { text: string; tone: "ok" | "muted" | "danger" }> = {
  active: { text: "Подтверждено", tone: "ok" },
  past: { text: "Завершено", tone: "muted" },
  cancelledByClient: { text: "Отменена клиентом", tone: "danger" },
  cancelledByOwner: { text: "Отменена залом", tone: "danger" },
};

export function BookingItem({ b, back }: { b: BookingItemView; back: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const s = STATUS[b.status];
  const cancelled = b.status === "cancelledByClient" || b.status === "cancelledByOwner";

  return (
    <li>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={`w-full rounded-xl border border-line bg-bg p-4 text-left transition hover:border-accent/50 ${cancelled ? "opacity-60" : ""} ${
          b.status === "active" ? "border-l-4 border-l-accent" : ""
        }`}
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-lg bg-card-2 px-2.5 py-1 text-sm font-bold tabular-nums">{b.time}</span>
          <Chip tone={s.tone}>{s.text}</Chip>
        </span>
        <span className="mt-3 block text-lg font-semibold">{b.clientName}</span>
        {b.phoneMasked && <span className="block font-mono text-sm text-muted">{b.phoneMasked}</span>}
      </button>

      <dialog
        ref={dialog}
        aria-label={`Запись ${b.time}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-card p-0 text-fg backdrop:bg-black/70 sm:m-auto sm:max-w-md sm:rounded-3xl"
      >
        <div className="relative px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
          <span aria-hidden="true" className="mx-auto block h-1.5 w-12 rounded-full bg-line sm:hidden" />
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Закрыть"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-card-2 text-muted hover:text-fg"
          >
            <CloseSym className="h-5 w-5" />
          </button>
          <p className="mt-4 text-sm font-bold text-accent">{cancelled ? s.text : "Запись к тренеру"}</p>
          <h2 className="mt-1 pr-12 text-2xl font-extrabold">
            {b.dayLabel} · {b.time}
          </h2>
          <p className="mt-1 text-muted">
            {b.clientName}
            {b.phoneMasked ? ` · ${b.phoneMasked}` : ""} · {b.trainerName}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-bg p-4">
              <p className="text-xs text-muted">Зал</p>
              <p className="mt-1 font-semibold">{b.hallName}</p>
            </div>
            <div className="rounded-xl bg-bg p-4">
              <p className="text-xs text-muted">Статус</p>
              <p className={`mt-1 font-semibold ${s.tone === "ok" ? "text-wa" : s.tone === "danger" ? "text-danger" : ""}`}>{s.text}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {b.whatsapp && (
              <a
                href={`https://wa.me/${b.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-14 items-center justify-center rounded-xl bg-wa text-lg font-semibold text-on-whatsapp"
              >
                Написать клиенту в WhatsApp
              </a>
            )}
            {b.status === "active" && (
              <form
                action={cancelBookingByOwnerAction}
                onSubmit={(e) => {
                  if (!window.confirm("Отменить запись? Время тренера освободится, клиент увидит отмену в кабинете.")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className="flex h-14 w-full items-center justify-center rounded-xl bg-danger/15 text-lg font-semibold text-danger hover:bg-danger/25">
                  Отменить запись
                </button>
                <p className="mt-2 text-center text-sm text-muted">Клиент увидит отмену в кабинете</p>
              </form>
            )}
            <button type="button" onClick={() => dialog.current?.close()} className="h-14 rounded-xl bg-card-2 text-lg font-semibold">
              Закрыть
            </button>
          </div>
        </div>
      </dialog>
    </li>
  );
}
