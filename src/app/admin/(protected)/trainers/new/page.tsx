import { isHall } from "@/modules/tariffs/client";
import { requireOwner } from "@/modules/owner";
import { TrainerForm } from "../TrainerForm";

export default async function NewTrainerPage({ searchParams }: { searchParams: Promise<{ hall?: string }> }) {
  await requireOwner();
  const { hall: rawHall } = await searchParams;
  const hallId = rawHall && isHall(rawHall) ? rawHall : "general";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-3xl font-extrabold lg:text-4xl">Новый тренер</h1>
      <p className="mb-6 text-sm text-muted">
        Тарифы добавите после сохранения. Фото можно будет загрузить на следующем этапе — пока карточка на сайте будет без
        фото.
      </p>
      <TrainerForm
        initial={{ name: "", hallId, descriptionRu: "", descriptionKk: "", sortOrder: "", isVisible: true }}
      />
    </div>
  );
}
