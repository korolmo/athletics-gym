"use server";

import { currentIpHash } from "@/lib/auth/login-limit";
import { readFormToken } from "@/lib/reviews/form-token";
import { parseVisitorReview, type VisitorReviewError } from "@/lib/validation/review";
import { checkVisitorSubmission, createVisitorReview } from "@/lib/services/reviews";

// Отзыв Посетителя с сайта. Сессии здесь нет — вместо неё антиспам: ловушка, время заполнения, лимит с адреса.
// Ошибки возвращаются кодами: текст на языке страницы берётся из словаря.

export type ReviewError = VisitorReviewError | "tooFast" | "stale" | "limit" | "unavailable";

export type ReviewFormState =
  | { status: "idle" }
  | { status: "sent" }
  /** При ошибке возвращаем введённое, чтобы Посетителю не пришлось набирать отзыв заново */
  | { status: "error"; error: ReviewError; values: Record<string, string> };

export async function submitReview(_prev: ReviewFormState, fd: FormData): Promise<ReviewFormState> {
  const field = (name: string) => String(fd.get(name) ?? "");
  const values = { authorName: field("authorName"), rating: field("rating"), text: field("text"), hallId: field("hallId") };
  const fail = (error: ReviewError): ReviewFormState => ({ status: "error", error, values });

  try {
    const ipHash = await currentIpHash();
    const check = await checkVisitorSubmission({
      // «website» — поле-ловушка: человеку оно не видно, заполняют его только роботы
      honeypot: field("website"),
      elapsedMs: readFormToken(field("formToken"), process.env.AUTH_SECRET),
      ipHash,
    });
    // Ловушка сработала: отвечаем как обычно, но ничего не записываем
    if (check.verdict === "trap") return { status: "sent" };
    if (check.verdict === "too-fast") return fail("tooFast");
    if (check.verdict === "stale") return fail("stale");
    if (check.verdict === "limit") return fail("limit");

    const parsed = parseVisitorReview(fd);
    if (!parsed.ok) return fail(parsed.error);

    await createVisitorReview(parsed.data, ipHash);
    return { status: "sent" };
  } catch (e) {
    console.error("Отзыв с сайта: не удалось принять.", e);
    return fail("unavailable");
  }
}
