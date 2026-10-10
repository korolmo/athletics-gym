import { requireOwner } from "@/lib/admin/guard";
import { DirectionForm } from "../DirectionForm";

export const dynamic = "force-dynamic";

export default async function NewDirectionPage() {
  await requireOwner();
  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide">Новое направление</h1>
      <DirectionForm initial={{ titleRu: "", titleKk: "", descriptionRu: "", descriptionKk: "", icon: "exercise", isVisible: true }} />
    </>
  );
}
