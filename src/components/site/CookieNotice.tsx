"use client";

import { useState, useSyncExternalStore } from "react";

/** Запись в памяти браузера: Посетитель нажал «Понятно». Это не cookie, и на сервер она не уходит. */
const KEY = "ag-cookie-notice";

const subscribe = () => () => {};

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // Память браузера закрыта (частный режим, запрет в настройках) — показываем сообщение
    return false;
  }
}

/**
 * Сообщение о cookie при первом визите: сайт ставит только необходимые, выбирать нечего — достаточно «Понятно».
 * Сервер его не отдаёт: показывать ли, знает только браузер. Стоит поверх страницы и контент не сдвигает;
 * на телефоне — над нижней панелью с кнопками (globals.css).
 */
export function CookieNotice({ label, text, more, ok, href }: { label: string; text: string; more: string; ok: string; href: string }) {
  const stored = useSyncExternalStore(subscribe, dismissed, () => true);
  const [closed, setClosed] = useState(false);
  if (stored || closed) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // Запомнить не удалось — сообщение просто закроется до следующего визита
    }
    setClosed(true);
  };

  return (
    <div
      role="region"
      aria-label={label}
      className="cookie-notice fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-surface-border bg-surface-card p-3 pl-4 text-body-sm text-text-primary shadow-xl md:inset-x-auto md:bottom-6 md:left-6 md:mx-0"
    >
      <p className="min-w-0 flex-1">
        {text}{" "}
        <a href={href} className="whitespace-nowrap text-primary-container underline underline-offset-2">
          {more}
        </a>
      </p>
      <button
        type="button"
        onClick={accept}
        className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary-container px-4 text-[13px] font-bold uppercase text-on-primary transition-all hover:brightness-95"
      >
        {ok}
      </button>
    </div>
  );
}
