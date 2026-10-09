import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrainerWithTariffs } from "@/lib/services/trainers";
import { isHall } from "@/lib/domain/tariff";
import { PlusIcon } from "@/components/icons";
import { TariffRow } from "../../tariffs/TariffRow";
import { DeleteTrainerButton, TrainerForm } from "../TrainerForm";
import { PhotoSlot } from "../../photos/PhotoSlot";
import { isStorageConfigured, mediaUrl } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

export default async function EditTrainerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const { id } = await params;
  const { saved, deleted } = await searchParams;
  const tr = await getTrainerWithTariffs(id);
  if (!tr || !isHall(tr.hallId)) notFound();

  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">{tr.name}</h1>

      {(saved || deleted) && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          {saved ? "Сохранено — уже на сайте" : "Тариф удалён"}
        </div>
      )}

      <div className="mb-6">
        <PhotoSlot
          target={`trainer:${tr.id}`}
          title="Плакат тренера"
          note="Карточка-плакат: на сайте заполняет рамку 3:4 и прижата к верху, по нажатию открывается целиком."
          url={mediaUrl(tr.uploadedPhoto)}
          fallback={tr.photo}
          shape="tall"
          disabled={!isStorageConfigured()}
        />
      </div>

      <TrainerForm
        initial={{
          id: tr.id,
          name: tr.name,
          hallId: tr.hallId,
          descriptionRu: tr.descriptionRu ?? "",
          descriptionKk: tr.descriptionKk ?? "",
          sortOrder: tr.sortOrder,
          isVisible: tr.isVisible,
        }}
      />

      <section className="mt-10 border-t border-line pt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl uppercase tracking-wide">Тарифы тренера</h2>
          <Link
            href={`/admin/tariffs/new?trainer=${tr.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
          >
            <PlusIcon />
            Добавить тариф
          </Link>
        </div>
        {tr.tariffs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
            У тренера пока нет тарифов — на сайте будет только кнопка «Записаться».
          </p>
        ) : (
          <ul className="space-y-2">
            {tr.tariffs.map((t) => (
              <TariffRow key={t.id} t={t} />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 border-t border-line pt-4">
        <DeleteTrainerButton id={tr.id} name={tr.name} tariffCount={tr.tariffs.length} />
      </div>
    </>
  );
}
