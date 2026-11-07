"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/modules/owner";
import { text } from "@/lib/admin/form";
import { cancelBookingByOwner } from "@/modules/bookings";

export async function cancelBookingByOwnerAction(fd: FormData): Promise<void> {
  await requireOwner();
  await cancelBookingByOwner(text(fd, "id"));
  const back = text(fd, "back");
  // Возвращаем только внутрь раздела: адрес из формы не должен уводить на чужой сайт
  redirect(back.startsWith("/admin/bookings") ? back : "/admin/bookings");
}
