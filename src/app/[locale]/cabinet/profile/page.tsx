import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { getCabinetTexts } from "@/app/brand";
import { formatPhone, requireClient } from "@/modules/clients";
import { legalPath } from "@/modules/legal/client";
import { CabinetShell } from "@/components/cabinet/Shell";
import { ProfileView } from "@/components/cabinet/ProfileView";

// Профиль (макеты 15, 14): имя, телефон-логин, выход, «Выйти на всех устройствах», удаление аккаунта.
export default async function CabinetProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const client = await requireClient(`/${locale}/cabinet/login`);
  const t = await getCabinetTexts(locale);
  return (
    <CabinetShell locale={locale} t={t} tab="profile">
      <ProfileView
        locale={locale}
        t={t}
        name={client.name}
        phone={formatPhone(client.phone)}
        privacyHref={legalPath(locale, "privacy")}
        termsHref={legalPath(locale, "terms")}
      />
    </CabinetShell>
  );
}
