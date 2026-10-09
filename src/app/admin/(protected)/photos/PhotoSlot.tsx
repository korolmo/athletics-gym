"use client";

import Image from "next/image";
import { removePhoto } from "./actions";
import { PhotoUploader } from "./PhotoUploader";

/**
 * Место с одним Фото: что сейчас на сайте, кнопка загрузки или замены и удаление.
 * `fallback` — картинка из public/, которая показывается, пока своё Фото не загружено.
 */
export function PhotoSlot({
  target,
  title,
  note,
  url,
  fallback,
  emptyNote = "Не загружено — на сайте не показывается",
  shape = "wide",
  disabled = false,
}: {
  target: string;
  title: string;
  note: string;
  /** Загруженное Фото; пусто — не загружено */
  url: string | null;
  fallback?: string | null;
  /** Что сказать, когда Фото не загружено и картинки по умолчанию нет */
  emptyNote?: string;
  shape?: "wide" | "tall";
  disabled?: boolean;
}) {
  const shown = url ?? fallback ?? null;
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-start gap-4">
        <div
          className={`relative shrink-0 overflow-hidden rounded-xl bg-bg ${shape === "tall" ? "h-32 w-24" : "h-24 w-32"}`}
        >
          {shown ? (
            <Image src={shown} alt="" fill sizes="128px" className={url ? "object-cover" : "object-cover opacity-50"} />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">Нет фото</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-snug">{title}</div>
          <div className="mt-0.5 text-sm text-muted">{note}</div>
          <div className={`mt-1 text-xs ${url ? "text-wa" : "text-muted"}`}>
            {url ? "Загружено своё фото" : fallback ? "Сейчас — картинка по умолчанию" : emptyNote}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <PhotoUploader target={target} label={url ? "Заменить фото" : "Загрузить фото"} disabled={disabled} />
      </div>

      {url && (
        <form
          action={removePhoto}
          className="mt-2"
          onSubmit={(e) => {
            const after = fallback ? " На сайте снова будет картинка по умолчанию." : " С сайта оно пропадёт.";
            if (!window.confirm(`Удалить фото: ${title}?${after}`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="target" value={target} />
          <button type="submit" className="w-full rounded-xl py-3 text-sm font-semibold text-danger hover:bg-danger/10">
            Удалить фото
          </button>
        </form>
      )}
    </div>
  );
}
