import Link from "next/link";
import { countReviewsByStatus, listReviews } from "@/modules/reviews";
import { REVIEW_STATUSES, isReviewStatus } from "@/modules/reviews/client";
import { REVIEW_STATUS_LABEL_RU } from "@/modules/reviews/client";
import { PlusIcon } from "@/components/icons";
import { Empty, Notice, PageHead } from "../../ui";
import { ReviewMeta, Stars, StatusButtons, StatusChip } from "./ReviewCard";

// Отзывы — по макету А8 (design/stitch/admin/a8-otzyvy-mobile.png): «Добавить отзыв» (перенос из 2ГИС или Instagram),
// вкладки статусов, карточки с инициалами, звёздами, источником и текстом в рамке. «Синхронизации с 2ГИС» из макета
// нет: тексты из 2ГИС сайт не забирает — их переносит Владелец.
export const dynamic = "force-dynamic";

const FILTER_LABEL = { NEW: "Новые", PUBLISHED: "На сайте", HIDDEN: "Скрыты" } as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string; saved?: string; deleted?: string }> }) {
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
      className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${active ? "bg-accent text-accent-ink" : "text-muted hover:text-fg"}`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-xs ${active ? "bg-accent-ink text-accent" : "bg-card-2"}`}>{count}</span>
    </Link>
  );

  return (
    <>
      <PageHead title="Отзывы клиентов" subtitle="Только настоящие отзывы. Отзыв с сайта ждёт вашего решения; на сайте видны опубликованные." />

      <Link href="/admin/reviews/new" className="mb-6 flex items-center gap-4 rounded-2xl bg-accent p-4 text-accent-ink transition hover:brightness-95">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-ink text-accent">
          <PlusIcon />
        </span>
        <span className="flex-1">
          <span className="block font-extrabold uppercase tracking-wide">Добавить отзыв</span>
          <span className="text-sm opacity-80">Перенос из 2ГИС, Instagram или сказанный лично</span>
        </span>
        <span aria-hidden="true" className="text-2xl">›</span>
      </Link>

      {(saved || deleted) && (
        <div className="mb-6">
          <Notice tone="ok">{saved ? "Сохранено" : "Отзыв удалён"}</Notice>
        </div>
      )}

      <div role="tablist" aria-label="Статус" className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-card p-1.5">
        {tab("/admin/reviews", "Все", total, !status)}
        {REVIEW_STATUSES.map((s) => tab(`/admin/reviews?status=${s}`, FILTER_LABEL[s], counts[s], status === s))}
      </div>

      {reviews.length === 0 ? (
        <Empty>
          {status
            ? `Отзывов в статусе «${REVIEW_STATUS_LABEL_RU[status]}» нет.`
            : "Отзывов пока нет. Добавьте настоящий отзыв клиента — из 2ГИС, Instagram или сказанный лично. Пока нет ни одного опубликованного, на сайте вместо отзывов стоят рейтинг 2ГИС и кнопка «Оставить отзыв»."}
        </Empty>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className={`rounded-2xl border border-line bg-card p-5 ${r.status === "HIDDEN" ? "opacity-75" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card-2 text-sm font-bold text-muted">{initials(r.authorName)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold leading-snug [overflow-wrap:anywhere]">{r.authorName}</div>
                  <Stars rating={r.rating} />
                </div>
                <StatusChip status={r.status} />
              </div>
              <ReviewMeta r={r} />
              <blockquote className="mt-4 line-clamp-6 whitespace-pre-line rounded-xl bg-bg p-4 [overflow-wrap:anywhere]">«{r.text}»</blockquote>
              <div className="mt-4 flex gap-2">
                <StatusButtons r={r} />
                <Link
                  href={`/admin/reviews/${r.id}`}
                  className="flex min-h-11 items-center justify-center rounded-xl bg-card-2 px-4 text-sm font-semibold text-fg hover:bg-line"
                >
                  {r.fromVisitor ? "Открыть" : "Править"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
