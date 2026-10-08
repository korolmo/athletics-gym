"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import { parseTariffForm } from "@/lib/validation/tariff";

export type TariffFormState = { error?: string } | undefined;

function backTo(trainerId: string | null, hallId: string, flag: string): string {
  return trainerId ? `/admin/trainers/${trainerId}?${flag}=1` : `/admin/tariffs?hall=${hallId}&${flag}=1`;
}

export async function saveTariff(_prev: TariffFormState, fd: FormData): Promise<TariffFormState> {
  await requireOwner();

  const parsed = parseTariffForm(fd);
  if (!parsed.ok) return { error: parsed.error };
  const { id, ...input } = parsed.data;

  // Тариф Тренера всегда в Зале Тренера
  let hallId: string = input.hallId;
  if (input.trainerId) {
    const trainer = await db.trainer.findUnique({ where: { id: input.trainerId } });
    if (!trainer) return { error: "Персональный тариф добавляется в карточке тренера" };
    hallId = trainer.hallId;
  }
  const data = { ...input, hallId };

  if (id) {
    try {
      await db.tariff.update({ where: { id }, data });
    } catch (e) {
      // Тариф могли удалить в другой вкладке — сообщаем, а не падаем с ошибкой сервера
      if (isNotFound(e)) return { error: NOT_FOUND_MESSAGE };
      throw e;
    }
  } else {
    const last = await db.tariff.aggregate({ where: { hallId, trainerId: data.trainerId }, _max: { sortOrder: true } });
    await db.tariff.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }

  revalidateSite();
  redirect(backTo(data.trainerId, hallId, "saved"));
}

export async function deleteTariff(fd: FormData): Promise<void> {
  await requireOwner();
  const id = text(fd, "id");
  const tariff = id ? await db.tariff.findUnique({ where: { id } }) : null;
  if (tariff) await db.tariff.deleteMany({ where: { id } });
  revalidateSite();
  redirect(backTo(tariff?.trainerId ?? null, tariff?.hallId ?? "general", "deleted"));
}

export async function toggleTariff(fd: FormData): Promise<void> {
  await requireOwner();
  const id = text(fd, "id");
  const tariff = await db.tariff.findUnique({ where: { id } });
  if (tariff) {
    await db.tariff.updateMany({ where: { id }, data: { isVisible: !tariff.isVisible } });
  }
  revalidateSite();
}
