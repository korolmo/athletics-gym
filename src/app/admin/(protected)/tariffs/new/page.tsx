import { db } from "@/lib/db";
import { isHall } from "@/lib/tariffs";
import { TariffForm } from "../TariffForm";

export const dynamic = "force-dynamic";

export default async function NewTariffPage({
  searchParams,
}: {
  searchParams: Promise<{ hall?: string; trainer?: string }>;
}) {
  const { hall: rawHall, trainer: trainerParam } = await searchParams;
  const trainers = await db.trainer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, hallId: true },
  });
  // Из карточки Тренера приходим с ?trainer=…: сразу персональный Тариф этого Тренера
  const trainer = trainers.find((t) => t.id === trainerParam);
  const hallId = trainer && isHall(trainer.hallId) ? trainer.hallId : rawHall && isHall(rawHall) ? rawHall : "general";

  return (
    <>
      <h1 className="mb-1 font-display text-3xl uppercase tracking-wide">Новый тариф</h1>
      <p className="mb-6 text-sm text-muted">{trainer ? `Тренер: ${trainer.name}` : "Позиция прайса зала"}</p>
      <TariffForm
        trainers={trainers}
        cancelHref={trainer ? `/admin/trainers/${trainer.id}` : `/admin/tariffs?hall=${hallId}`}
        initial={{
          hallId,
          trainerId: trainer?.id ?? "",
          category: trainer ? "PERSONAL" : "VISITS",
          titleRu: "",
          titleKk: "",
          visitsPerMonth: 12,
          durationMonths: 1,
          access: "FULL",
          audience: "ALL",
          price: "",
          priceTo: "",
          isVisible: true,
        }}
      />
    </>
  );
}
