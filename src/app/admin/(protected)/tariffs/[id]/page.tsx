import { notFound } from "next/navigation";
import { getTariff } from "@/modules/tariffs";
import { getTrainer } from "@/modules/trainers";
import { isAccess, isAudience, isCategory, isHall } from "@/modules/tariffs/client";
import { tariffLabelRu } from "@/modules/tariffs/client";
import { TariffForm } from "../TariffForm";
import { DeleteButton } from "../DeleteButton";

export const dynamic = "force-dynamic";

export default async function EditTariffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTariff(id);
  if (!t || !isCategory(t.category) || !isHall(t.hallId) || !isAccess(t.access) || !isAudience(t.audience)) notFound();
  // Тарифы о Тренерах не знают: имя Тренера берём у модуля Тренеры
  const trainer = t.trainerId ? await getTrainer(t.trainerId) : null;

  return (
    <>
      <h1 className="mb-1 font-display text-3xl uppercase tracking-wide">Редактировать тариф</h1>
      <p className="mb-6 text-sm text-muted">
        {trainer ? `Персональные тренировки · тренер ${trainer.name}` : "Позиция прайса зала"}
      </p>
      <TariffForm
        trainer={trainer ? { id: trainer.id, name: trainer.name } : undefined}
        cancelHref={t.trainerId ? `/admin/trainers/${t.trainerId}` : `/admin/tariffs?hall=${t.hallId}`}
        initial={{
          id: t.id,
          hallId: t.hallId,
          category: t.category,
          titleRu: t.titleRu ?? "",
          titleKk: t.titleKk ?? "",
          visitsPerMonth: t.visitsPerMonth ?? "",
          durationMonths: t.durationMonths ?? "",
          access: t.access,
          audience: t.audience,
          price: t.price,
          priceTo: t.priceTo ?? "",
          isVisible: t.isVisible,
        }}
      />
      <div className="mt-6 border-t border-line pt-4">
        <DeleteButton id={t.id} name={tariffLabelRu(t)} />
      </div>
    </>
  );
}
