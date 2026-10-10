import Link from "next/link";
import { notFound } from "next/navigation";
import { getReview } from "@/lib/services/reviews";
import { isSafeSourceUrl, toDateInput, todayInGym } from "@/lib/domain/review";
import { ReviewMeta, Stars, StatusButtons, StatusChip } from "../ReviewCard";
import { DeleteReviewButton, ReviewForm } from "../ReviewForm";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReview(id);
  if (!r) notFound();

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-wide">Отзыв</h1>
        <StatusChip status={r.status} />
      </div>

      {r.fromVisitor ? (
        // Отзыв Посетителя: текст не правится — только опубликовать, скрыть или удалить
        <>
          <div className="rounded-2xl bg-card p-4">
            <div className="font-semibold leading-snug [overflow-wrap:anywhere]">{r.authorName}</div>
            <div className="mt-0.5 text-sm">
              <Stars rating={r.rating} />
            </div>
            <ReviewMeta r={r} />
            <p className="mt-4 whitespace-pre-line [overflow-wrap:anywhere]">{r.text}</p>
          </div>
          <p className="mt-3 text-xs text-muted">
            Этот отзыв оставлен на сайте. Его текст нельзя править — так отзывы остаются честными. Вы решаете только,
            показывать ли его.
          </p>
          <div className="mt-5 flex gap-2">
            <StatusButtons r={r} />
          </div>
          <Link href="/admin/reviews" className="mt-3 block rounded-xl border border-line px-5 py-3.5 text-center font-semibold text-muted">
            К списку
          </Link>
        </>
      ) : (
        <ReviewForm
          today={toDateInput(todayInGym(new Date()))}
          initial={{
            id: r.id,
            authorName: r.authorName,
            text: r.text,
            rating: r.rating,
            hallId: r.hallId ?? "",
            source: r.source,
            sourceUrl: isSafeSourceUrl(r.sourceUrl) ? r.sourceUrl : "",
            reviewedAt: toDateInput(r.reviewedAt),
            // «Новый» бывает только у Отзыва Посетителя; ручной либо показан, либо скрыт
            isVisible: r.status === "PUBLISHED",
          }}
        />
      )}

      <div className="mt-8 border-t border-line pt-4">
        <DeleteReviewButton id={r.id} author={r.authorName} />
      </div>
    </>
  );
}
