import { notFound } from "next/navigation";
import { getSettingsForEdit } from "@/lib/services/site-settings";
import { isSettingsForm } from "@/lib/domain/site-settings";
import { SETTINGS_FORM_LABEL_RU } from "@/lib/presentation/site-settings-labels";
import { AboutForm, ContactsForm, HeroForm, RatingForm, WomenForm } from "../SettingsForms";

export const dynamic = "force-dynamic";

export default async function EditSettingsPage({ params }: { params: Promise<{ form: string }> }) {
  const { form } = await params;
  if (!isSettingsForm(form)) notFound();
  const { settings, cards } = await getSettingsForEdit();

  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">{SETTINGS_FORM_LABEL_RU[form]}</h1>
      {form === "hero" && <HeroForm s={settings} />}
      {form === "about" && <AboutForm cards={cards} />}
      {form === "women" && <WomenForm s={settings} />}
      {form === "contacts" && <ContactsForm s={settings} />}
      {form === "rating" && <RatingForm s={settings} />}
    </>
  );
}
