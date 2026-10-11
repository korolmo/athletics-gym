"use client";

import { useActionState, useEffect, useState } from "react";
import type { Dictionary } from "@/dictionaries/ru";
import type { Locale } from "@/lib/i18n";
import { REVIEW_LIMITS } from "@/lib/domain/review";
import { HALLS } from "@/lib/domain/tariff";
import { legalPath } from "@/lib/legal/meta";
import { openReviewForm, submitReview, type ReviewFormState } from "@/app/[locale]/actions";

const field =
  "w-full rounded-xl bg-surface-container px-4 py-3 text-body-md text-text-primary outline-none ring-1 ring-surface-border transition placeholder:text-text-muted focus:ring-2 focus:ring-primary-container";
const labelCls = "mb-1.5 block text-body-sm text-text-muted";

/**
 * Форма «Оставить отзыв»: имя, оценка, текст и Зал по желанию. Телефон и почту не спрашиваем.
 * Перед кнопкой — Согласие на обработку данных: без галочки форму не отправит браузер и не примет сервер.
 */
export function ReviewForm({
  t,
  locale,
  onCancel,
}: {
  t: Dictionary;
  locale: Locale;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(submitReview, { status: "idle" });
  // Подписанная метка времени открытия формы — для проверки «не быстрее трёх секунд». Её выдаёт сервер, когда форма
  // открылась; пока метки нет, отправить нельзя. Не выдал — говорим, что отправка сейчас недоступна
  const [formToken, setFormToken] = useState<string | null>("");
  useEffect(() => {
    let live = true;
    openReviewForm().then(
      (token) => live && setFormToken(token),
      () => live && setFormToken(null),
    );
    return () => {
      live = false;
    };
  }, []);
  const f = t.reviews.form;
  const typed = state.status === "error" ? state.values : undefined;

  if (state.status === "sent") {
    return (
      <p role="status" className="rounded-2xl bg-surface-card p-6 text-body-lg text-text-primary shadow-xs">
        {f.thanks}
      </p>
    );
  }

  return (
    <form action={action} className="rounded-2xl bg-surface-card p-6 shadow-md">
      <h3 className="text-headline-md uppercase text-text-primary">{f.title}</h3>
      <p className="mt-1 text-body-sm text-text-muted">{f.note}</p>

      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="formToken" value={formToken ?? ""} />
      {/* Поле-ловушка: людям не видно и с клавиатуры недоступно; заполняют его только роботы */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{f.name}</span>
          <input
            name="authorName"
            required
            maxLength={REVIEW_LIMITS.nameMax}
            autoComplete="given-name"
            defaultValue={typed?.authorName ?? ""}
            className={field}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{f.hall}</span>
          <select name="hallId" defaultValue={typed?.hallId ?? ""} className={field}>
            <option value="">{f.hallAny}</option>
            {HALLS.map((h) => (
              <option key={h} value={h}>
                {t.halls[h]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className={labelCls}>{f.rating}</legend>
        {/* Оценка заранее не выбрана — её ставит сам Посетитель.
            Звёзды идут справа налево, чтобы одним CSS подсветить выбранную и все «младшие» */}
        <div className="flex flex-row-reverse justify-end gap-1">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="peer cursor-pointer text-text-muted/70 has-[:checked]:text-star peer-has-[:checked]:text-star">
              <input
                type="radio"
                name="rating"
                value={n}
                required
                defaultChecked={typed?.rating === String(n)}
                aria-label={t.reviews.ratingLabel.replace("{n}", String(n))}
                className="peer/star sr-only"
              />
              <span className="block rounded-lg px-1 text-[34px] leading-[44px] peer-focus-visible/star:outline peer-focus-visible/star:outline-2 peer-focus-visible/star:outline-primary-container">
                ★
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className={labelCls}>{f.text}</span>
        <textarea
          name="text"
          required
          rows={5}
          minLength={REVIEW_LIMITS.textMin}
          maxLength={REVIEW_LIMITS.textMax}
          defaultValue={typed?.text ?? ""}
          className={field}
        />
        <span className="mt-1 block text-[12px] leading-4 text-text-muted">{f.textHint}</span>
      </label>

      <label className="mt-4 flex items-start gap-3 text-body-sm text-text-muted">
        <input
          type="checkbox"
          name="consent"
          required
          defaultChecked={typed?.consent === "on"}
          className="mt-0.5 h-5 w-5 shrink-0 accent-primary-container"
        />
        <span>
          {f.consentBefore}
          <a href={legalPath(locale, "privacy")} target="_blank" rel="noopener" className="text-primary-container underline underline-offset-2">
            {f.consentLink}
          </a>
          {f.consentAfter}
        </span>
      </label>

      {(state.status === "error" || formToken === null) && (
        <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-body-sm text-red-300">
          {t.reviews.errors[state.status === "error" ? state.error : "unavailable"]}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-12 items-center justify-center rounded-xl px-6 text-[14px] uppercase text-text-muted transition-colors hover:text-text-primary"
        >
          {f.cancel}
        </button>
        <button
          type="submit"
          disabled={pending || !formToken}
          className="flex h-12 items-center justify-center rounded-xl bg-primary-container px-6 text-[14px] font-bold uppercase text-on-primary shadow-md transition-all hover:brightness-95 disabled:opacity-60"
        >
          {pending ? f.sending : f.submit}
        </button>
      </div>
    </form>
  );
}
