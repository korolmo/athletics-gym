"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, requireRealOwner } from "@/modules/owner";
import { text } from "@/lib/admin/form";
import { deliverPending, resolveEvent, resolveSender, retryEvent } from "@/modules/notifications";
import { getClub } from "@/modules/club";

/** «Отправить ещё раз»: событие снова в очереди — и сразу попытка отправки. */
export async function retryEventAction(fd: FormData): Promise<void> {
  await requireRealOwner();
  await retryEvent(text(fd, "id"), requireOwner);
  await deliverPending(resolveSender(), (await getClub()).timeZone);
  revalidatePath("/admin", "layout");
}

export async function resolveEventAction(fd: FormData): Promise<void> {
  await requireRealOwner();
  await resolveEvent(text(fd, "id"), requireOwner);
  revalidatePath("/admin", "layout");
}
