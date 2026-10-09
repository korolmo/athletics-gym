"use client";

import { useState } from "react";
import type { Dictionary } from "@/dictionaries/ru";
import type { Locale } from "@/lib/i18n";
import { REVIEWS_FIRST, REVIEW_COLLAPSE_AT, type ReviewSource } from "@/lib/domain/review";
import { OpenInNewSym } from "@/components/symbols";
import { label } from "@/components/ui/styles";
import { ReviewForm } from "@/components/site/reviews/ReviewForm";

export type ReviewView = {
  id: string;
  authorName: string;
  text: string;
  rating: number;
  source: ReviewSource;
  /** Ссылка на оригинал — уже проверенная (только https); пусто — ссылки нет */
  sourceUrl: string | null;
  /** Дата на языке страницы */
  date: string;
};

function ReviewCard({ r, t }: { r: ReviewView; t: Dictionary }) {
  const long = r.text.length > REVIEW_COLLAPSE_AT;
  const [open, setOpen] = useState(false);
  const source = t.reviews.sources[r.source];

  return (
    <article className="flex min-w-0 flex-col rounded-2xl bg-surface-card p-6 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-headline-sm text-text-primary [overflow-wrap:anywhere]">{r.authorName}</h3>
        <span aria-label={t.reviews.ratingLabel.replace("{n}", String(r.rating))} className="shrink-0 whitespace-nowrap text-[15px] leading-6 text-star">
          {"★".repeat(r.rating)}
          <span className="text-surface-border">{"★".repeat(5 - r.rating)}</span>
        </span>
      </div>

      {/* Текст отзыва выводится только как текст: разметка в нём не исполняется */}
      <p className={`mt-3 whitespace-pre-line text-body-md text-text-muted [overflow-wrap:anywhere] ${long && !open ? "line-clamp-5" : ""}`}>
        {r.text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`${label} mt-2 min-h-11 self-start text-primary-container transition-colors hover:text-text-primary`}
        >
          {open ? t.reviews.collapse : t.reviews.expand}
        </button>
      )}

      <div className={`${label} mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-text-muted`}>
        {r.sourceUrl ? (
          <a
            href={r.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 transition-colors hover:text-primary-container"
          >
            {source}
            <OpenInNewSym className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span>{source}</span>
        )}
        <span aria-hidden="true">·</span>
        <span>{r.date}</span>
      </div>
    </article>
  );
}

/** Отзывы на сайте: первые несколько сразу, остальные по «Ещё»; под ними — «Оставить отзыв», форма открывается тут же. */
export function ReviewsBoard({
  t,
  locale,
  reviews,
  formToken,
}: {
  t: Dictionary;
  locale: Locale;
  reviews: ReviewView[];
  formToken: string;
}) {
  const [all, setAll] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const shown = all ? reviews : reviews.slice(0, REVIEWS_FIRST);
  const hidden = reviews.length - shown.length;
  const button =
    "flex h-12 items-center justify-center rounded-xl px-6 text-[14px] uppercase shadow-xs transition-all";

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <ReviewCard key={r.id} r={r} t={t} />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        {hidden > 0 && (
          <button type="button" onClick={() => setAll(true)} className={`${button} bg-surface-card text-text-primary hover:text-primary-container`}>
            {t.reviews.more} · {hidden}
          </button>
        )}
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className={`${button} bg-primary-container font-bold text-on-primary hover:brightness-95`}
          >
            {t.reviews.leave}
          </button>
        )}
      </div>

      {formOpen && (
        <div id="review-form" className="mx-auto mt-6 max-w-[760px]">
          <ReviewForm t={t} locale={locale} formToken={formToken} onCancel={() => setFormOpen(false)} />
        </div>
      )}
    </>
  );
}
