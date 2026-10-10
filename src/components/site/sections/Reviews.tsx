import { site } from "@/lib/site";
import { ratingCountText } from "@/lib/presentation/rating";
import { OpenInNewSym } from "@/components/symbols";
import { container, label, sectionY } from "@/components/ui/styles";
import { SectionHead } from "@/components/ui/SectionHead";
import type { SectionProps } from "@/components/site/sections/types";
import { ReviewsBoard, type ReviewView } from "@/components/site/reviews/ReviewsBoard";

// Отзывы: только настоящие и только опубликованные Владельцем; рядом — рейтинг зала в 2ГИС.
// Пока опубликованных нет, пустую секцию не показываем: остаются рейтинг 2ГИС и кнопка «Оставить отзыв».
export function Reviews({ locale, t, s, reviews, formToken }: SectionProps & { reviews: ReviewView[]; formToken: string }) {
  const empty = reviews.length === 0;
  const rating = (
    <a
      href={site.twoGisReviews}
      target="_blank"
      rel="noopener noreferrer"
      // В заголовке Блока рейтинг — отдельная плашка. Без Отзывов он лежит внутри карточки с кнопкой:
      // своих отступов и фона у него там нет, чтобы текст начинался с того же края, что в форме и в «Спасибо»
      className={`flex items-center gap-3 transition-colors hover:text-primary-container ${
        empty ? "" : "rounded-xl bg-surface-card px-4 py-3 shadow-xs"
      }`}
    >
      <span className="text-headline-md text-text-primary">
        <span className="text-star">★</span> {s.rating.value}
      </span>
      <span className="flex flex-col">
        <span className={`${label} text-text-primary`}>{ratingCountText(t.rating, s.rating.count)}</span>
        <span className="inline-flex items-center gap-1 text-body-sm text-text-muted">
          {t.rating.read}
          <OpenInNewSym className="h-3.5 w-3.5" />
        </span>
      </span>
    </a>
  );

  if (empty) {
    return (
      <section id="reviews" className="w-full py-4">
        <div className={container}>
          <ReviewsBoard t={t} locale={locale} reviews={reviews} formToken={formToken} rating={rating} />
        </div>
      </section>
    );
  }

  return (
    <section id="reviews" className={`w-full bg-surface-container-low ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.reviews}
          title={t.rating.title}
          aside={rating}
        />
        <ReviewsBoard t={t} locale={locale} reviews={reviews} formToken={formToken} />
      </div>
    </section>
  );
}
