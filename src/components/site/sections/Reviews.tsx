import { site } from "@/lib/site";
import { ratingCountText } from "@/lib/presentation/rating";
import { OpenInNewSym } from "@/components/symbols";
import { container, label, sectionY } from "@/components/ui/styles";
import { SectionHead } from "@/components/ui/SectionHead";
import type { SectionProps } from "@/components/site/sections/types";
import { ReviewsBoard, type ReviewView } from "@/components/site/reviews/ReviewsBoard";

// Отзывы: только настоящие и только опубликованные Владельцем; рядом — рейтинг зала в 2ГИС
export function Reviews({ locale, t, s, reviews, formToken }: SectionProps & { reviews: ReviewView[]; formToken: string }) {
  return (
    <section id="reviews" className={`w-full bg-surface-container-low ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.reviews}
          title={t.rating.title}
          aside={
            <a
              href={site.twoGisReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-surface-card px-4 py-3 shadow-xs transition-colors hover:text-primary-container"
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
          }
        />
        <ReviewsBoard t={t} locale={locale} reviews={reviews} formToken={formToken} />
      </div>
    </section>
  );
}
