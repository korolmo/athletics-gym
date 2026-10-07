import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isAccess, isAudience, isCategory, isHall, tariffLabelRu } from "@/lib/tariffs";
import { TariffForm } from "../TariffForm";
import { DeleteButton } from "../DeleteButton";

export const dynamic = "force-dynamic";

export default async function EditTariffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, trainers] = await Promise.all([
    db.tariff.findUnique({ where: { id }, include: { trainer: true } }),
    db.trainer.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, hallId: true } }),
  ]);
  if (!t || !isCategory(t.category) || !isHall(t.hallId) || !isAccess(t.access) || !isAudience(t.audience)) notFound();

  return (
    <>
      <h1 className="mb-1 font-display text-3xl uppercase tracking-wide">Редактировать тариф</h1>
      <p className="mb-6 text-sm text-muted">{t.trainer ? `Тренер: ${t.trainer.name}` : "Позиция прайса зала"}</p>
      <TariffForm
        trainers={trainers}
        cancelHref={t.trainerId ? `/admin/trainers/${t.trainerId}` : `/admin/tariffs?hall=${t.hallId}`}
        initial={{
          id: t.id,
          hallId: t.hallId,
          trainerId: t.trainerId ?? "",
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
