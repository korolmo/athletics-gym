import { notFound } from "next/navigation";
import { getCabinetDictionary, getDictionary, isLocale } from "@/lib/i18n";
import { whatsappUrl } from "@/lib/site";
import { requireClient } from "@/modules/clients";
import { CLIENT_CANCEL_DEADLINE_MS, MAX_FUTURE_BOOKINGS, listMyBookings } from "@/modules/bookings";
import { getTrainerNames } from "@/modules/trainers";
import { getSiteSettings } from "@/modules/site";
import { CabinetShell } from "@/components/cabinet/Shell";
import { BookingsView } from "@/components/cabinet/BookingsView";

// «Мои Записи» (макеты 7, 8): будущие — с отменой или подсказкой «только через зал», прошедшие, пустое состояние.
export default async function CabinetHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const client = await requireClient(`/${locale}/cabinet/login`);
  const [t, bookings, { settings }] = await Promise.all([getCabinetDictionary(locale), listMyBookings(), getSiteSettings()]);
  const names = await getTrainerNames(bookings.flatMap((b) => (b.trainerId ? [b.trainerId] : [])));
  return (
    <CabinetShell locale={locale} t={t} tab="bookings">
      <BookingsView
        locale={locale}
        t={t}
        halls={getDictionary(locale).halls}
        name={client.name}
        bookings={bookings}
        trainerNames={names}
        whatsapp={settings.whatsapp}
        waHref={whatsappUrl(settings.whatsapp, t.login.waText)}
        max={MAX_FUTURE_BOOKINGS}
        deadlineHours={CLIENT_CANCEL_DEADLINE_MS / 3_600_000}
      />
    </CabinetShell>
  );
}
