import { requireOwner } from "@/lib/admin/guard";
import { toDateInput, todayInGym } from "@/lib/domain/review";
import { ReviewForm } from "../ReviewForm";

export const dynamic = "force-dynamic";

export default async function NewReviewPage() {
  await requireOwner();
  const today = toDateInput(todayInGym(new Date()));
  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">Новый отзыв</h1>
      <ReviewForm
        today={today}
        initial={{ authorName: "", text: "", rating: 5, hallId: "", source: "TWOGIS", sourceUrl: "", reviewedAt: today, isVisible: true }}
      />
    </>
  );
}
