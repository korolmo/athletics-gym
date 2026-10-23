"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon, RefreshIcon } from "@/components/icons";

// Кнопки страниц ошибок сайта и админки; вид задаёт страница (className).

/**
 * «Попробовать снова»: ошибка сервера не уйдёт от одного reset() — сначала просим у сервера свежие данные
 * (router.refresh), потом сбрасываем границу ошибки, всё в одном переходе.
 */
export function RetryButton({ reset, label, pending: pendingLabel, className }: { reset: () => void; label: string; pending: string; className: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() =>
        start(() => {
          router.refresh();
          reset();
        })
      }
    >
      <RefreshIcon className={`h-5 w-5 ${pending ? "motion-safe:animate-spin" : ""}`} />
      <span aria-live="polite">{pending ? pendingLabel : label}</span>
    </button>
  );
}

/** Код ошибки (digest Next — по нему ошибку находят в журнале сервера) с кнопкой «Скопировать». */
export function CopyCode({ code, copy, copied, className }: { code: string; copy: string; copied: string; className: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        navigator.clipboard
          ?.writeText(code)
          .then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          })
          .catch(() => {});
      }}
    >
      <span className="font-mono font-bold tracking-wider">{code}</span>
      {done ? <CheckIcon className="h-4 w-4 shrink-0" /> : <CopyIcon className="h-4 w-4 shrink-0" />}
      <span className="sr-only" aria-live="polite">
        {done ? copied : copy}
      </span>
    </button>
  );
}
