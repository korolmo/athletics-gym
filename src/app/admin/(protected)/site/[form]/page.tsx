import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettingsForEdit } from "@/modules/site";
import { isSettingsForm } from "@/modules/site/client";
import { SETTINGS_FORM_LABEL_RU } from "@/modules/site/client";
import { PageHead } from "../../../ui";
import { AboutForm, ContactsForm, HeroForm, LegalForm, MarqueeForm, RatingForm, WomenForm } from "../SettingsForms";

// Форма раздела «Сайт» — по макету А9 (design/stitch/admin/a9-kontakty-mobile.png): «Сайт / Контакты», форма в карточке.
export const dynamic = "force-dynamic";

export default async function EditSettingsPage({ params }: { params: Promise<{ form: string }> }) {
  const { form } = await params;
  if (!isSettingsForm(form)) notFound();
  const { settings, cards } = await getSettingsForEdit();

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">
        <Link href="/admin/site" className="hover:text-accent">
          Сайт
        </Link>{" "}
        / <span className="text-accent">{SETTINGS_FORM_LABEL_RU[form]}</span>
      </p>
      <PageHead title={SETTINGS_FORM_LABEL_RU[form]} />
      {form === "hero" && <HeroForm s={settings} />}
      {form === "marquee" && <MarqueeForm s={settings} />}
      {form === "about" && <AboutForm cards={cards} />}
      {form === "women" && <WomenForm s={settings} />}
      {form === "contacts" && <ContactsForm s={settings} />}
      {form === "rating" && <RatingForm s={settings} />}
      {form === "legal" && <LegalForm s={settings} />}
    </div>
  );
}
