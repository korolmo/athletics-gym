import { notFound } from "next/navigation";
import { getDirection } from "@/modules/directions";
import { DIRECTION_ICONS, isDirectionIcon } from "@/modules/directions/client";
import { isStorageConfigured } from "@/modules/photos";
import { PhotoSlot } from "../../photos/PhotoSlot";
import { DeleteDirectionButton, DirectionForm } from "../DirectionForm";

export const dynamic = "force-dynamic";

export default async function EditDirectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const d = await getDirection(id);
  if (!d) notFound();

  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold lg:text-4xl [overflow-wrap:anywhere]">{d.titleRu}</h1>

      {created && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          Направление добавлено — уже на сайте. Ниже можно загрузить своё фото вместо иконки.
        </div>
      )}

      <DirectionForm
        hasPhoto={Boolean(d.photoUrl)}
        initial={{
          id: d.id,
          titleRu: d.titleRu,
          titleKk: d.titleKk ?? "",
          descriptionRu: d.descriptionRu ?? "",
          descriptionKk: d.descriptionKk ?? "",
          icon: isDirectionIcon(d.icon) ? d.icon : DIRECTION_ICONS[0],
          isVisible: d.isVisible,
        }}
      />

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="mb-3 text-xl font-bold">Своё фото</h2>
        <PhotoSlot
          target={`direction:${d.id}`}
          title="Фото вместо иконки"
          note="На сайте стоит на месте иконки, небольшим квадратом. Лучше крупный план без мелких деталей."
          url={d.photoUrl}
          emptyNote="Не загружено — на сайте показывается иконка"
          disabled={!isStorageConfigured()}
        />
      </section>

      <div className="mt-8 border-t border-line pt-4">
        <DeleteDirectionButton id={d.id} title={d.titleRu} />
      </div>
    </>
  );
}
