import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { getCabinetTexts } from "@/app/brand";
import { whatsappUrl } from "@/lib/site";
import { requireClient } from "@/modules/clients";
import { CLIENT_CANCEL_DEADLINE_MS, MAX_FUTURE_BOOKINGS, listMyBookings } from "@/modules/bookings";
import { listVisibleTrainersWithTariffs } from "@/modules/trainers";
import { HALLS } from "@/modules/tariffs/client";
import { getSiteSettings } from "@/modules/site";
import { CabinetShell } from "@/components/cabinet/Shell";
import { BookingFlow } from "@/components/cabinet/BookingFlow";

// Запись к Тренеру (макет 9) и её результат (12 — время заняли, 13 — лимит, «Вы записаны»).
export default async function CabinetBookPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireClient(`/${locale}/cabinet/login`);
  const [t, trainers, bookings, { settings }] = await Promise.all([
    getCabinetTexts(locale),
    listVisibleTrainersWithTariffs(),
    listMyBookings(),
    getSiteSettings(),
  ]);
  const names = Object.fromEntries(trainers.map((tr) => [tr.id, tr.name]));
  const upcoming = bookings
    .filter((b) => b.view === "upcoming")
    .map((b) => ({ start: b.startAt.toISOString(), trainer: (b.trainerId && names[b.trainerId]) || t.bookings.trainerGone }));
  return (
    <CabinetShell locale={locale} t={t} tab="book">
      <BookingFlow
        locale={locale}
        t={t}
        halls={HALLS.map((id) => ({ id, name: getDictionary(locale).halls[id] }))}
        trainers={trainers.map((tr) => ({ id: tr.id, name: tr.name, hallId: tr.hallId }))}
        upcoming={upcoming}
        max={MAX_FUTURE_BOOKINGS}
        deadlineHours={CLIENT_CANCEL_DEADLINE_MS / 3_600_000}
        waHref={whatsappUrl(settings.whatsapp, t.login.waText)}
      />
    </CabinetShell>
  );
}
