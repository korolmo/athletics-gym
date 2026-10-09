import { isHall } from "@/lib/domain/tariff";
import type { ReviewSource, ReviewStatus } from "@/lib/domain/review";
import { REVIEW_SOURCE_LABEL_RU, REVIEW_STATUS_LABEL_RU, formatReviewDateRu } from "@/lib/presentation/review-labels";
import { HALL_LABEL_RU } from "@/lib/presentation/tariff-labels";
import { setReviewStatus } from "./actions";

export type AdminReview = {
  id: string;
  authorName: string;
  text: string;
  rating: number;
  hallId: string | null;
  source: ReviewSource;
  sourceUrl: string | null;
  reviewedAt: Date;
  status: ReviewStatus;
  fromVisitor: boolean;
};

const STATUS_CHIP: Record<ReviewStatus, string> = {
  NEW: "bg-accent text-accent-ink",
  PUBLISHED: "bg-wa/15 text-wa",
  HIDDEN: "bg-line text-muted",
};

export function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`Оценка ${rating} из 5`} className="whitespace-nowrap text-accent">
      {"★".repeat(rating)}
      <span className="text-line">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/** Что известно об Отзыве кроме текста: источник, дата, Зал, кем добавлен. */
export function ReviewMeta({ r }: { r: AdminReview }) {
  const parts = [
    REVIEW_SOURCE_LABEL_RU[r.source],
    formatReviewDateRu(r.reviewedAt),
    r.hallId && isHall(r.hallId) ? HALL_LABEL_RU[r.hallId] : null,
    r.fromVisitor ? "оставлен на сайте" : "добавлен вручную",
  ].filter(Boolean);
  return <div className="mt-0.5 text-xs text-muted">{parts.join(" · ")}</div>;
}

export function StatusChip({ status }: { status: ReviewStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CHIP[status]}`}>
      {REVIEW_STATUS_LABEL_RU[status]}
    </span>
  );
}

/** Кнопки «Опубликовать» и «Скрыть»: какие из них нужны, зависит от статуса. */
export function StatusButtons({ r }: { r: AdminReview }) {
  const button = (status: "PUBLISHED" | "HIDDEN", label: string, primary: boolean) => (
    <form action={setReviewStatus} className="flex-1">
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={
          primary
            ? "min-h-11 w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-ink hover:brightness-95"
            : "min-h-11 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-muted hover:text-fg"
        }
      >
        {label}
      </button>
    </form>
  );
  return (
    <>
      {r.status !== "PUBLISHED" && button("PUBLISHED", "Опубликовать", true)}
      {r.status !== "HIDDEN" && button("HIDDEN", "Скрыть", false)}
    </>
  );
}
