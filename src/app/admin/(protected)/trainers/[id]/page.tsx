import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrainerWithTariffs } from "@/modules/trainers";
import { isHall } from "@/modules/tariffs/client";
import { PlusIcon } from "@/components/icons";
import { TariffRow } from "../../tariffs/TariffRow";
import { DeleteTrainerButton, TrainerForm } from "../TrainerForm";
import { PhotoSlot } from "../../photos/PhotoSlot";
import { isStorageConfigured, mediaUrl } from "@/modules/photos";
import { getScheduleForAdmin } from "@/modules/schedule";
import { getClubOnce } from "@/app/brand";
import { ScheduleCard } from "../ScheduleCard";
import { CardTitle, Empty, Notice, PageHead, btnDark, card } from "../../../ui";

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
/** «2026-11-15» → «15 ноября» */
const dayLabel = (day: string) => `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

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
  const schedule = await getScheduleForAdmin(tr.id, (await getClubOnce()).timeZone);


  return (
    <>
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">
        <Link href={`/admin/trainers?hall=${tr.hallId}`} className="hover:underline">
          Тренеры
        </Link>{" "}
        · <span className={tr.isVisible ? "text-wa" : "text-muted"}>{tr.isVisible ? "на сайте" : "скрыт с сайта"}</span>
      </p>
      <PageHead title={tr.name} />

      {(saved || deleted) && (
        <div className="mb-6">
          <Notice tone="ok">{saved ? "Сохранено — уже на сайте" : "Тариф удалён"}</Notice>
        </div>
      )}

      {/* Макет А5: плакат и основное — слева, тарифы и часы работы — справа (на телефоне — друг под другом) */}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <PhotoSlot
            target={`trainer:${tr.id}`}
            title="Плакат тренера (3:4)"
            note="Карточка-плакат: на сайте заполняет рамку 3:4 и прижата к верху, по нажатию открывается целиком."
            url={mediaUrl(tr.uploadedPhoto)}
            fallback={tr.photo}
            shape="tall"
            disabled={!isStorageConfigured()}
          />
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
        </div>

        <div className="space-y-5">
          <section className={card}>
            <CardTitle title="Тарифы тренера" aside={`${tr.tariffs.length} тариф.`} />
            {tr.tariffs.length === 0 ? (
              <Empty>У тренера пока нет тарифов — на сайте будет только кнопка «Записаться».</Empty>
            ) : (
              <ul className="space-y-3">
                {tr.tariffs.map((t) => (
                  <TariffRow key={t.id} t={t} />
                ))}
              </ul>
            )}
            <Link href={`/admin/tariffs/new?trainer=${tr.id}`} className={`${btnDark} mt-4 w-full text-accent`}>
              <PlusIcon />
              Добавить тариф
            </Link>
          </section>

          <ScheduleCard
            trainerId={tr.id}
            schedule={{ ...schedule, timeOff: schedule.timeOff.map((t) => ({ ...t, label: { from: dayLabel(t.fromDay), to: dayLabel(t.toDay) } })) }}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-4">
        <DeleteTrainerButton id={tr.id} name={tr.name} tariffCount={tr.tariffs.length} />
      </div>
    </>
  );
}
