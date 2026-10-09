import Link from "next/link";
import { countReviewsByStatus, listReviews } from "@/lib/services/reviews";
import { REVIEW_STATUSES, isReviewStatus } from "@/lib/domain/review";
import { REVIEW_STATUS_LABEL_RU } from "@/lib/presentation/review-labels";
import { PlusIcon } from "@/components/icons";
import { ReviewMeta, Stars, StatusButtons, StatusChip } from "./ReviewCard";

export const dynamic = "force-dynamic";

const FILTER_LABEL = { NEW: "Новые", PUBLISHED: "Опубликованы", HIDDEN: "Скрыты" } as const;

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string; deleted?: string }>;
}) {
  const { status: rawStatus, saved, deleted } = await searchParams;
  const status = rawStatus && isReviewStatus(rawStatus) ? rawStatus : undefined;
  const [reviews, counts] = await Promise.all([listReviews(status), countReviewsByStatus()]);
  const total = counts.NEW + counts.PUBLISHED + counts.HIDDEN;

  const tab = (href: string, label: string, count: number, active: boolean) => (
    <Link
      key={href}
      href={href}
      role="tab"
      aria-selected={active}
      className={
        active
          ? "shrink-0 rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-semibold text-accent-ink"
          : "shrink-0 rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-muted hover:text-fg"
      }
    >
      {label} · {count}
    </Link>
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Отзывы</h1>
        <p className="mt-1 text-sm text-muted">
          Только настоящие отзывы клиентов. На сайте видны опубликованные; отзыв, оставленный на сайте, ждёт вашего решения.
        </p>
      </div>

      {(saved || deleted) && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          {saved ? "Сохранено" : "Отзыв удалён"}
        </div>
      )}

      <div role="tablist" aria-label="Статус" className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-card p-1">
        {tab("/admin/reviews", "Все", total, !status)}
        {REVIEW_STATUSES.map((s) => tab(`/admin/reviews?status=${s}`, FILTER_LABEL[s], counts[s], status === s))}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
          {status
            ? `Отзывов в статусе «${REVIEW_STATUS_LABEL_RU[status]}» нет.`
            : "Отзывов пока нет. Добавьте настоящий отзыв клиента — из 2ГИС, Instagram или сказанный лично. Пока нет ни одного опубликованного, блок «Отзывы» на сайте не показывается."}
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className={`rounded-2xl bg-card p-4 ${r.status === "HIDDEN" ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug [overflow-wrap:anywhere]">{r.authorName}</div>
                  <div className="mt-0.5 text-sm">
                    <Stars rating={r.rating} />
                  </div>
                  <ReviewMeta r={r} />
                </div>
                <StatusChip status={r.status} />
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm [overflow-wrap:anywhere]">{r.text}</p>
              <div className="mt-4 flex gap-2">
                <StatusButtons r={r} />
                <Link
                  href={`/admin/reviews/${r.id}`}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-muted hover:border-accent hover:text-accent"
                >
                  {r.fromVisitor ? "Открыть" : "Править"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/admin/reviews/new"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-4 font-semibold text-accent-ink shadow-lg shadow-black/40"
      >
        <PlusIcon />
        Добавить отзыв
      </Link>
    </>
  );
}
