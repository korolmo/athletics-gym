import { revalidatePath } from "next/cache";

/** После любого изменения в админке: обновить сайт на обоих языках и списки админки. */
export function revalidateSite(): void {
  revalidatePath("/ru");
  revalidatePath("/kk");
  revalidatePath("/admin/tariffs");
  revalidatePath("/admin/trainers");
  revalidatePath("/admin/site");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/directions");
}
