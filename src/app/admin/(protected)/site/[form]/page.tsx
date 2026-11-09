import { notFound } from "next/navigation";
import { getSettingsForEdit } from "@/modules/site";
import { isSettingsForm } from "@/modules/site/client";
import { SETTINGS_FORM_LABEL_RU } from "@/modules/site/client";
import { AboutForm, ContactsForm, HeroForm, LegalForm, MarqueeForm, RatingForm, WomenForm } from "../SettingsForms";

export const dynamic = "force-dynamic";

export default async function EditSettingsPage({ params }: { params: Promise<{ form: string }> }) {
  const { form } = await params;
  if (!isSettingsForm(form)) notFound();
  const { settings, cards } = await getSettingsForEdit();

  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold lg:text-4xl">{SETTINGS_FORM_LABEL_RU[form]}</h1>
      {form === "hero" && <HeroForm s={settings} />}
      {form === "marquee" && <MarqueeForm s={settings} />}
      {form === "about" && <AboutForm cards={cards} />}
      {form === "women" && <WomenForm s={settings} />}
      {form === "contacts" && <ContactsForm s={settings} />}
      {form === "rating" && <RatingForm s={settings} />}
      {form === "legal" && <LegalForm s={settings} />}
    </>
  );
}
