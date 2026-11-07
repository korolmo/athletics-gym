import { notFound, redirect } from "next/navigation";
import { getCabinetDictionary, isLocale } from "@/lib/i18n";
import { whatsappUrl } from "@/lib/site";
import { legalPath } from "@/modules/legal/client";
import { DEMO_PHONES, currentClient, formatPhone, resolveCodeChannel } from "@/modules/clients";
import { getSiteSettings } from "@/modules/site";
import { LoginForm } from "@/components/cabinet/LoginForm";

// Вход в кабинет (макеты 1screen, 2, 5, 6): телефон → код → при первом входе имя и Согласие.
export default async function CabinetLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (await currentClient()) redirect(`/${locale}/cabinet`);
  const t = await getCabinetDictionary(locale);
  const { settings } = await getSiteSettings();
  const demo = resolveCodeChannel()?.name === "demo";
  const phones = `${formatPhone(DEMO_PHONES[0])} … ${DEMO_PHONES[DEMO_PHONES.length - 1].slice(-2)}`;
  return (
    <LoginForm
      locale={locale}
      t={t}
      demoPhones={demo ? phones : null}
      waHref={whatsappUrl(settings.whatsapp, t.login.waText)}
      privacyHref={legalPath(locale, "privacy")}
    />
  );
}
