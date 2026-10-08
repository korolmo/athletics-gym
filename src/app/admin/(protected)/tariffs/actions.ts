"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { checked, optionalInt, text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { LIMITS } from "@/lib/admin/limits";
import { NOT_FOUND_MESSAGE, isNotFound } from "@/lib/admin/db-errors";
import { CATEGORY_FIELDS, isAccess, isAudience, isCategory, isHall } from "@/lib/domain/tariff";

export type TariffFormState = { error?: string } | undefined;

function backTo(trainerId: string | null, hallId: string, flag: string): string {
  return trainerId ? `/admin/trainers/${trainerId}?${flag}=1` : `/admin/tariffs?hall=${hallId}&${flag}=1`;
}

export async function saveTariff(_prev: TariffFormState, fd: FormData): Promise<TariffFormState> {
  await requireOwner();

  const id = text(fd, "id");
  const category = text(fd, "category");
  let hallId = text(fd, "hallId");
  if (!isCategory(category)) return { error: "Выберите категорию" };
  if (!isHall(hallId)) return { error: "Выберите зал" };
  const fields = CATEGORY_FIELDS[category];

  const price = optionalInt(text(fd, "price"));
  if (price === null || !Number.isInteger(price) || price < 0) {
    return { error: "Цена — целое число в тенге, например 12000" };
  }
  if (price > LIMITS.price) return { error: `Цена не больше ${LIMITS.price} ₸` };

  // Поля, которых у Категории нет, не сохраняем — даже если они пришли из формы
  let priceTo: number | null = null;
  if (fields.priceTo) {
    priceTo = optionalInt(text(fd, "priceTo"));
    if (priceTo !== null && (!Number.isInteger(priceTo) || priceTo <= price)) {
      return { error: "Верхняя граница диапазона должна быть больше цены" };
    }
    if (priceTo !== null && priceTo > LIMITS.price) return { error: `Цена не больше ${LIMITS.price} ₸` };
  }

  let visitsPerMonth: number | null = null;
  if (fields.visits) {
    visitsPerMonth = optionalInt(text(fd, "visitsPerMonth"));
    if (visitsPerMonth === null && category === "VISITS") return { error: "Укажите число посещений в месяц" };
    if (visitsPerMonth !== null && (!Number.isInteger(visitsPerMonth) || visitsPerMonth < 1)) {
      return { error: "Число в месяц — целое, от 1" };
    }
    if (visitsPerMonth !== null && visitsPerMonth > LIMITS.visitsPerMonth) {
      return { error: `Число в месяц — не больше ${LIMITS.visitsPerMonth}` };
    }
  }

  let durationMonths: number | null = null;
  if (fields.months) {
    durationMonths = optionalInt(text(fd, "durationMonths"));
    if (durationMonths === null || !Number.isInteger(durationMonths) || durationMonths < 1) {
      return { error: "Срок — целое число месяцев, от 1" };
    }
    if (durationMonths > LIMITS.durationMonths) return { error: `Срок — не больше ${LIMITS.durationMonths} месяцев` };
  }

  const access = fields.access ? text(fd, "access") : "FULL";
  if (!isAccess(access)) return { error: "Выберите время доступа" };
  const audience = fields.audience ? text(fd, "audience") : "ALL";
  if (!isAudience(audience)) return { error: "Выберите аудиторию" };

  // Персональные тренировки — только у Тренеров; остальные Категории — только в прайсе Зала
  let trainerId: string | null = null;
  if (fields.trainer) {
    const trainer = text(fd, "trainerId") ? await db.trainer.findUnique({ where: { id: text(fd, "trainerId") } }) : null;
    if (!trainer) return { error: "Персональный тариф добавляется в карточке тренера" };
    trainerId = trainer.id;
    // Тариф Тренера всегда в Зале Тренера
    hallId = trainer.hallId;
  }

  const titleRu = fields.title ? text(fd, "titleRu") || null : null;
  const titleKk = fields.title ? text(fd, "titleKk") || null : null;
  if ((titleRu?.length ?? 0) > LIMITS.title || (titleKk?.length ?? 0) > LIMITS.title) {
    return { error: `Уточнение — не длиннее ${LIMITS.title} символов` };
  }

  const data = {
    hallId,
    trainerId,
    category,
    titleRu,
    titleKk,
    visitsPerMonth,
    durationMonths,
    access,
    audience,
    price,
    priceTo,
    isVisible: checked(fd, "isVisible"),
  };

  if (id) {
    try {
      await db.tariff.update({ where: { id }, data });
    } catch (e) {
      // Тариф могли удалить в другой вкладке — сообщаем, а не падаем с ошибкой сервера
      if (isNotFound(e)) return { error: NOT_FOUND_MESSAGE };
      throw e;
    }
  } else {
    const last = await db.tariff.aggregate({ where: { hallId, trainerId }, _max: { sortOrder: true } });
    await db.tariff.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
  }

  revalidateSite();
  redirect(backTo(trainerId, hallId, "saved"));
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
