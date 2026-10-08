"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { parseTariffForm } from "@/lib/validation/tariff";
import * as tariffs from "@/lib/services/tariffs";

// Действия — тонкие: права → валидация → сервис → обновить страницы и вернуть Владельца в список

export type TariffFormState = { error?: string } | undefined;

function backTo(place: tariffs.TariffPlace | null, flag: string): string {
  return place?.trainerId
    ? `/admin/trainers/${place.trainerId}?${flag}=1`
    : `/admin/tariffs?hall=${place?.hallId ?? "general"}&${flag}=1`;
}

export async function saveTariff(_prev: TariffFormState, fd: FormData): Promise<TariffFormState> {
  await requireOwner();
  const parsed = parseTariffForm(fd);
  if (!parsed.ok) return { error: parsed.error };

  const result = await tariffs.saveTariff(parsed.data);
  if (!result.ok) return { error: result.error };

  revalidateSite();
  redirect(backTo(result, "saved"));
}

export async function deleteTariff(fd: FormData): Promise<void> {
  await requireOwner();
  const place = await tariffs.deleteTariff(text(fd, "id"));
  revalidateSite();
  redirect(backTo(place, "deleted"));
}

export async function toggleTariff(fd: FormData): Promise<void> {
  await requireOwner();
  await tariffs.toggleTariffVisibility(text(fd, "id"));
  revalidateSite();
}
