"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { CATEGORY_FIELDS, isAccess, isAudience, isCategory, isHall } from "@/lib/tariffs";

export type TariffFormState = { error?: string } | undefined;

async function requireOwner() {
  if (!(await isAuthed())) redirect("/admin/login");
}

function revalidateSite() {
  revalidatePath("/ru");
  revalidatePath("/kk");
  revalidatePath("/admin/tariffs");
  revalidatePath("/admin/trainers");
}

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/** Пустая строка → null, иначе число (возможно NaN — проверяет вызывающий). */
function optionalInt(raw: string): number | null {
  const clean = raw.replace(/\s/g, "");
  return clean === "" ? null : Number(clean);
}

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

  // Поля, которых у Категории нет, не сохраняем — даже если они пришли из формы
  let priceTo: number | null = null;
  if (fields.priceTo) {
    priceTo = optionalInt(text(fd, "priceTo"));
    if (priceTo !== null && (!Number.isInteger(priceTo) || priceTo <= price)) {
      return { error: "Верхняя граница диапазона должна быть больше цены" };
    }
  }

  let visitsPerMonth: number | null = null;
  if (fields.visits) {
    visitsPerMonth = optionalInt(text(fd, "visitsPerMonth"));
    if (visitsPerMonth === null && category === "VISITS") return { error: "Укажите число посещений в месяц" };
    if (visitsPerMonth !== null && (!Number.isInteger(visitsPerMonth) || visitsPerMonth < 1)) {
      return { error: "Число в месяц — целое, от 1" };
    }
  }

  let durationMonths: number | null = null;
  if (fields.months) {
    durationMonths = optionalInt(text(fd, "durationMonths"));
    if (durationMonths === null || !Number.isInteger(durationMonths) || durationMonths < 1) {
      return { error: "Срок — целое число месяцев, от 1" };
    }
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

  const data = {
    hallId,
    trainerId,
    category,
    titleRu: fields.title ? text(fd, "titleRu") || null : null,
    titleKk: fields.title ? text(fd, "titleKk") || null : null,
    visitsPerMonth,
    durationMonths,
    access,
    audience,
    price,
    priceTo,
    isVisible: fd.get("isVisible") === "on",
  };

  if (id) {
    await db.tariff.update({ where: { id }, data });
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
  if (tariff) await db.tariff.delete({ where: { id } });
  revalidateSite();
  redirect(backTo(tariff?.trainerId ?? null, tariff?.hallId ?? "general", "deleted"));
}

export async function toggleTariff(fd: FormData): Promise<void> {
  await requireOwner();
  const id = text(fd, "id");
  const tariff = await db.tariff.findUnique({ where: { id } });
  if (tariff) {
    await db.tariff.update({ where: { id }, data: { isVisible: !tariff.isVisible } });
  }
  revalidateSite();
}
