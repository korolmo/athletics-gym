import { requireOwner } from "@/modules/owner";
import { DirectionForm } from "../DirectionForm";

export const dynamic = "force-dynamic";

export default async function NewDirectionPage() {
  await requireOwner();
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold lg:text-4xl">Новое направление</h1>
      <DirectionForm initial={{ titleRu: "", titleKk: "", descriptionRu: "", descriptionKk: "", icon: "exercise", isVisible: true }} />
    </>
  );
}
