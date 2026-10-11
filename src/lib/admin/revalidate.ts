import { revalidatePath } from "next/cache";
import { locales } from "@/lib/i18n";
import { LEGAL_PAGES, legalPath } from "@/lib/legal/meta";

/** После любого изменения в админке: обновить сайт на обоих языках и списки админки. */
export function revalidateSite(): void {
  revalidatePath("/ru");
  revalidatePath("/kk");
  // Юридические страницы берут реквизиты, адрес и телефон из Настроек сайта
  for (const locale of locales) for (const page of LEGAL_PAGES) revalidatePath(legalPath(locale, page));
  revalidatePath("/admin/tariffs");
  revalidatePath("/admin/trainers");
  revalidatePath("/admin/site");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/directions");
}
