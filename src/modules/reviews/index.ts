// Модуль Отзывы (этап 6, ADR 0015): Отзыв, Статус и Источник отзыва, форма Посетителя с антиспамом.
// Снаружи — только этот файл (сервер) и client.ts (браузер). Зависит от Тарифов (Залы); о юридических
// документах не знает — дату редакции Политики для Согласия ему передаёт действие сайта.
import "server-only";

export * from "./client";
export {
  VISITOR_REVIEW_ERRORS,
  ownerReviewSchema,
  parseOwnerReviewForm,
  parseVisitorReview,
  visitorReviewSchema,
  type OwnerReviewInput,
  type VisitorReviewError,
  type VisitorReviewInput,
} from "./validation/review";
export {
  checkVisitorSubmission,
  countNewReviews,
  countReviewsByStatus,
  createVisitorReview,
  deleteReview,
  getReview,
  listPublishedReviews,
  listReviews,
  saveOwnerReview,
  setReviewStatus,
} from "./service/reviews";
export { issueFormToken, readFormToken } from "./service/form-token";
export { demoRestore as restoreReviewsDemo, demoSnapshot as snapshotReviewsDemo } from "./service/demo";
