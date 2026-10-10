"use client";

import Link from "next/link";
import { useActionState } from "react";
import { REVIEW_LIMITS, REVIEW_SOURCES, type ReviewSource } from "@/lib/domain/review";
import { HALLS } from "@/lib/domain/tariff";
import { REVIEW_SOURCE_LABEL_RU } from "@/lib/presentation/review-labels";
import { HALL_LABEL_RU } from "@/lib/presentation/tariff-labels";
import { deleteReview, saveReview, type ReviewFormState } from "./actions";

export type ReviewFormValues = {
  /** Пусто — новый Отзыв */
  id?: string;
  authorName: string;
  text: string;
  rating: number;
  hallId: string;
  source: ReviewSource;
  sourceUrl: string;
  /** ГГГГ-ММ-ДД */
  reviewedAt: string;
  isVisible: boolean;
};

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none transition placeholder:text-muted/60 focus:border-accent";
const labelCls = "mb-1.5 block text-sm text-muted";
const hint = "mt-1 block text-xs text-muted";

/** Отзыв, который Владелец переносит на сайт сам — из 2ГИС, Instagram, Google или со слов клиента. */
export function ReviewForm({ initial, today }: { initial: ReviewFormValues; today: string }) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(saveReview, undefined);
  const typed = state?.values;
  const value = (name: keyof ReviewFormValues) => typed?.[name] ?? String(initial[name] ?? "");
  const visible = typed ? typed.isVisible === "on" : initial.isVisible;

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <label className="block">
        <span className={labelCls}>Имя автора *</span>
        <input
          name="authorName"
          required
          maxLength={REVIEW_LIMITS.nameMax}
          defaultValue={value("authorName")}
          placeholder="Как подписан отзыв"
          className={field}
        />
      </label>

      <fieldset>
        <legend className={labelCls}>Оценка *</legend>
        <div className="grid grid-cols-5 gap-1 rounded-xl bg-card p-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                required
                defaultChecked={Number(value("rating")) === n}
                className="peer sr-only"
              />
              <span className="block rounded-lg py-2.5 text-center font-semibold text-muted peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                {n} ★
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={labelCls}>Текст отзыва *</span>
        <textarea
          name="text"
          required
          rows={6}
          maxLength={REVIEW_LIMITS.textMax}
          defaultValue={value("text")}
          className={field}
        />
        <span className={hint}>
          Слово в слово, как написал клиент. Отзывы только настоящие — придумывать и приукрашивать нельзя. На казахской
          версии сайта текст показывается без перевода.
        </span>
      </label>

      <label className="block">
        <span className={labelCls}>Источник *</span>
        <select name="source" defaultValue={value("source")} className={field}>
          {REVIEW_SOURCES.map((s) => (
            <option key={s} value={s}>
              {REVIEW_SOURCE_LABEL_RU[s]}
            </option>
          ))}
        </select>
        <span className={hint}>Где оставлен отзыв. «Другое» — например, сказан лично или прислан в WhatsApp.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Ссылка на оригинал</span>
        <input
          name="sourceUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          maxLength={REVIEW_LIMITS.urlMax}
          defaultValue={value("sourceUrl")}
          placeholder="https://…"
          className={field}
        />
        <span className={hint}>Необязательно. Только адрес, который начинается с https://.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Дата отзыва *</span>
        <input name="reviewedAt" type="date" required max={today} defaultValue={value("reviewedAt")} className={field} />
      </label>

      <label className="block">
        <span className={labelCls}>Зал</span>
        <select name="hallId" defaultValue={value("hallId")} className={field}>
          <option value="">Не указан</option>
          {HALLS.map((h) => (
            <option key={h} value={h}>
              {HALL_LABEL_RU[h]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center justify-between gap-4 rounded-xl bg-card px-4 py-3.5">
        <span>Показывать на сайте</span>
        <input name="isVisible" type="checkbox" defaultChecked={visible} className="h-6 w-6 accent-[#f5e642]" />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Link href="/admin/reviews" className="rounded-xl border border-line px-5 py-3.5 font-semibold text-muted">
          {initial.id ? "К списку" : "Отмена"}
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-accent py-3.5 font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : initial.id ? "Сохранить" : "Добавить отзыв"}
        </button>
      </div>
    </form>
  );
}

export function DeleteReviewButton({ id, author }: { id: string; author: string }) {
  return (
    <form
      action={deleteReview}
      onSubmit={(e) => {
        if (!window.confirm(`Удалить отзыв от «${author}»? Вернуть его будет нельзя.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="w-full rounded-xl py-3 text-sm font-semibold text-danger hover:bg-danger/10">
        Удалить отзыв
      </button>
    </form>
  );
}
