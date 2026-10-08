import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { isHall } from "@/lib/tariffs";
import { TariffForm } from "../TariffForm";

export const dynamic = "force-dynamic";

export default async function NewTariffPage({
  searchParams,
}: {
  searchParams: Promise<{ hall?: string; trainer?: string }>;
}) {
  await requireOwner();
  const { hall: rawHall, trainer: trainerId } = await searchParams;
  // Из карточки Тренера приходим с ?trainer=…: это его персональный Тариф
  const trainer = trainerId ? await db.trainer.findUnique({ where: { id: trainerId } }) : null;
  if (trainerId && (!trainer || !isHall(trainer.hallId))) notFound();
  const hallId = trainer && isHall(trainer.hallId) ? trainer.hallId : rawHall && isHall(rawHall) ? rawHall : "general";

  return (
    <>
      <h1 className="mb-1 font-display text-3xl uppercase tracking-wide">Новый тариф</h1>
      <p className="mb-6 text-sm text-muted">
        {trainer ? `Персональные тренировки · тренер ${trainer.name}` : "Позиция прайса зала"}
      </p>
      <TariffForm
        trainer={trainer ? { id: trainer.id, name: trainer.name } : undefined}
        cancelHref={trainer ? `/admin/trainers/${trainer.id}` : `/admin/tariffs?hall=${hallId}`}
        initial={{
          hallId,
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
