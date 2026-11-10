import { requireOwner } from "@/modules/owner";
import { toDateInput, todayInGym } from "@/modules/reviews/client";
import { ReviewForm } from "../ReviewForm";

export const dynamic = "force-dynamic";

export default async function NewReviewPage() {
  await requireOwner();
  const today = toDateInput(todayInGym(new Date()));
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-extrabold lg:text-4xl">Новый отзыв</h1>
      <ReviewForm
        today={today}
        initial={{ authorName: "", text: "", rating: 5, hallId: "", source: "TWOGIS", sourceUrl: "", reviewedAt: today, isVisible: true }}
      />
    </div>
  );
}
