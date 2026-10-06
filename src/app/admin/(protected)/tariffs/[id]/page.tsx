import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isCategory, isUnit } from "@/lib/tariffs";
import { TariffForm } from "../TariffForm";
import { DeleteButton } from "../DeleteButton";

export const dynamic = "force-dynamic";

export default async function EditTariffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await db.tariff.findUnique({ where: { id } });
  if (!t || !isCategory(t.category) || !isUnit(t.durationUnit)) notFound();

  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">Редактировать тариф</h1>
      <TariffForm
        initial={{
          id: t.id,
          category: t.category,
          nameRu: t.nameRu,
          nameKk: t.nameKk ?? "",
          descriptionRu: t.descriptionRu ?? "",
          descriptionKk: t.descriptionKk ?? "",
          price: t.price,
          durationValue: t.durationValue,
          durationUnit: t.durationUnit,
          isVisible: t.isVisible,
        }}
      />
      <div className="mt-6 border-t border-line pt-4">
        <DeleteButton id={t.id} name={t.nameRu} />
      </div>
    </>
  );
}
