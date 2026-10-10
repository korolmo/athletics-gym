import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import {
  SUBMISSION_WINDOW_MS,
  checkSubmission,
  todayInGym,
  type OwnerStatus,
  type ReviewStatus,
  type SubmissionCheck,
} from "@/lib/domain/review";
import type { OwnerReviewInput, VisitorReviewInput } from "@/lib/validation/review";
import type { ServiceResult } from "./result";

// Отзывы. Две границы доступа:
// — сайт: чтение только опубликованных и приём Отзыва от Посетителя (без сессии, под антиспамом);
// — админка: всё остальное, каждая функция сама проверяет сессию Владельца.

/** Записи об отправках старше двух суток для лимита не нужны. */
const KEEP_SUBMISSIONS_MS = 2 * SUBMISSION_WINDOW_MS;

// ——— Сайт ———

/** Отзывы для сайта: только опубликованные, свежие первыми. */
export async function listPublishedReviews() {
  return db.review.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, authorName: true, text: true, rating: true, source: true, sourceUrl: true, reviewedAt: true },
  });
}

/**
 * Проверка отправки до разбора текста: ловушка, время заполнения, лимит с адреса.
 * `ipHash` — хэш адреса Посетителя; сам адрес в базу не попадает.
 */
export async function checkVisitorSubmission(
  meta: { honeypot: string; elapsedMs: number | null; ipHash: string },
  now: Date = new Date(),
): Promise<SubmissionCheck> {
  // При сработавшей ловушке в базу не ходим вовсе
  if (meta.honeypot.trim() !== "") return { verdict: "trap" };
  const recent = await db.reviewSubmission.findMany({
    where: { ipHash: meta.ipHash, createdAt: { gt: new Date(now.getTime() - SUBMISSION_WINDOW_MS) } },
    select: { createdAt: true },
  });
  return checkSubmission({ honeypot: meta.honeypot, elapsedMs: meta.elapsedMs, recent: recent.map((r) => r.createdAt) }, now);
}

/**
 * Записывает Отзыв Посетителя: статус «Новый», на сайте не виден до решения Владельца.
 * Вызывается только после checkVisitorSubmission с вердиктом «accept» и проверки текста.
 */
export async function createVisitorReview(input: VisitorReviewInput, ipHash: string, now: Date = new Date()): Promise<void> {
  await db.$transaction([
    db.review.create({
      data: { ...input, source: "SITE", sourceUrl: null, reviewedAt: todayInGym(now), status: "NEW", fromVisitor: true },
    }),
    db.reviewSubmission.create({ data: { ipHash } }),
    db.reviewSubmission.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - KEEP_SUBMISSIONS_MS) } } }),
  ]);
}

// ——— Админка ———

/** Отзывы для раздела «Отзывы»: новые первыми, дальше — по дате добавления. Можно отобрать по статусу. */
export async function listReviews(status?: ReviewStatus) {
  await requireOwner();
  const reviews = await db.review.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: "desc" } });
  return [...reviews.filter((r) => r.status === "NEW"), ...reviews.filter((r) => r.status !== "NEW")];
}

/** Сколько Отзывов в каждом статусе — для фильтра. */
export async function countReviewsByStatus(): Promise<Record<ReviewStatus, number>> {
  await requireOwner();
  const groups = await db.review.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<ReviewStatus, number> = { NEW: 0, PUBLISHED: 0, HIDDEN: 0 };
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

/** Счётчик новых Отзывов для меню админки. */
export async function countNewReviews(): Promise<number> {
  await requireOwner();
  return db.review.count({ where: { status: "NEW" } });
}

export async function getReview(id: string) {
  await requireOwner();
  return db.review.findUnique({ where: { id } });
}

/**
 * Создаёт или правит Отзыв, добавленный Владельцем вручную.
 * Отзыв Посетителя так править нельзя: его текст остаётся таким, каким был отправлен.
 */
export async function saveOwnerReview(input: OwnerReviewInput): Promise<ServiceResult<{ id: string }>> {
  await requireOwner();
  const { id, ...data } = input;

  if (!id) {
    const created = await db.review.create({ data: { ...data, fromVisitor: false } });
    return { ok: true, id: created.id };
  }

  const existing = await db.review.findUnique({ where: { id }, select: { fromVisitor: true } });
  if (!existing) return { ok: false, error: NOT_FOUND_MESSAGE };
  if (existing.fromVisitor) {
    return { ok: false, error: "Отзыв посетителя править нельзя: его можно опубликовать, скрыть или удалить." };
  }
  try {
    await db.review.update({ where: { id }, data });
  } catch (e) {
    if (isNotFound(e)) return { ok: false, error: NOT_FOUND_MESSAGE };
    throw e;
  }
  return { ok: true, id };
}

/** «Опубликовать» или «Скрыть» — для любого Отзыва, и ручного, и от Посетителя. */
export async function setReviewStatus(id: string, status: OwnerStatus): Promise<void> {
  await requireOwner();
  await db.review.updateMany({ where: { id }, data: { status } });
}

export async function deleteReview(id: string): Promise<void> {
  await requireOwner();
  if (id) await db.review.deleteMany({ where: { id } });
}
