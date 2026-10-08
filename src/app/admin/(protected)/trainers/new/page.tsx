import { isHall } from "@/lib/tariffs";
import { requireOwner } from "@/lib/admin/guard";
import { TrainerForm } from "../TrainerForm";

export default async function NewTrainerPage({ searchParams }: { searchParams: Promise<{ hall?: string }> }) {
  await requireOwner();
  const { hall: rawHall } = await searchParams;
  const hallId = rawHall && isHall(rawHall) ? rawHall : "general";

  return (
    <>
      <h1 className="mb-1 font-display text-3xl uppercase tracking-wide">Новый тренер</h1>
      <p className="mb-6 text-sm text-muted">
        Тарифы добавите после сохранения. Фото можно будет загрузить на следующем этапе — пока карточка на сайте будет без
        фото.
      </p>
      <TrainerForm
        initial={{ name: "", hallId, descriptionRu: "", descriptionKk: "", sortOrder: "", isVisible: true }}
      />
    </>
  );
}
