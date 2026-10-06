import { TariffForm } from "../TariffForm";

export default function NewTariffPage() {
  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">Новый тариф</h1>
      <TariffForm
        initial={{
          category: "MONTHLY",
          nameRu: "",
          nameKk: "",
          descriptionRu: "",
          descriptionKk: "",
          price: "",
          durationValue: 1,
          durationUnit: "MONTH",
          isVisible: true,
        }}
      />
    </>
  );
}
