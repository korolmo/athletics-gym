"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { isCategory, isUnit } from "@/lib/tariffs";

export type TariffFormState = { error?: string } | undefined;

async function requireAdmin() {
  if (!(await isAuthed())) redirect("/admin/login");
}

function revalidateSite() {
  revalidatePath("/ru");
  revalidatePath("/kk");
  revalidatePath("/admin/tariffs");
}

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function saveTariff(_prev: TariffFormState, fd: FormData): Promise<TariffFormState> {
  await requireAdmin();

  const id = text(fd, "id");
  const category = text(fd, "category");
  const nameRu = text(fd, "nameRu");
  const price = Number(text(fd, "price").replace(/\s/g, ""));
  const durationValue = Number(text(fd, "durationValue"));
  const durationUnit = text(fd, "durationUnit");

  if (!isCategory(category)) return { error: "Выберите категорию" };
  if (!nameRu) return { error: "Заполните название на русском" };
  if (!Number.isInteger(price) || price < 0) return { error: "Цена — целое число в тенге, например 9000" };
  if (!isUnit(durationUnit)) return { error: "Выберите единицу срока" };
  if (!Number.isInteger(durationValue) || durationValue < 1) return { error: "Срок — целое число от 1" };

  const data = {
    category,
    nameRu,
    nameKk: text(fd, "nameKk") || null,
    descriptionRu: text(fd, "descriptionRu") || null,
    descriptionKk: text(fd, "descriptionKk") || null,
    price,
    durationValue,
    durationUnit,
    isVisible: fd.get("isVisible") === "on",
  };

  if (id) {
    await db.tariff.update({ where: { id }, data });
  } else {
    await db.tariff.create({ data });
  }

  revalidateSite();
  redirect("/admin/tariffs?saved=1");
}

export async function deleteTariff(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = text(fd, "id");
  if (id) await db.tariff.delete({ where: { id } });
  revalidateSite();
  redirect("/admin/tariffs?deleted=1");
}

export async function toggleTariff(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = text(fd, "id");
  const tariff = await db.tariff.findUnique({ where: { id } });
  if (tariff) {
    await db.tariff.update({ where: { id }, data: { isVisible: !tariff.isVisible } });
  }
  revalidateSite();
}
