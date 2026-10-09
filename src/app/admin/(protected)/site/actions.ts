"use server";

import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/admin/guard";
import { text } from "@/lib/admin/form";
import { revalidateSite } from "@/lib/admin/revalidate";
import { isBlock } from "@/lib/domain/site-settings";
import {
  parseAboutForm,
  parseContactsForm,
  parseHeroForm,
  parseRatingForm,
  parseWomenForm,
} from "@/lib/validation/site-settings";
import type { Parsed } from "@/lib/validation/shared";
import * as settings from "@/lib/services/site-settings";

// Действия — тонкие: права → валидация → сервис → обновить страницы и вернуть Владельца в список

/** При ошибке возвращаем введённое: после отправки форма сбрасывается, а набранный с телефона текст терять нельзя. */
export type SettingsFormState = { error: string; values: Record<string, string> } | undefined;

async function save<T>(
  fd: FormData,
  parse: (fd: FormData) => Parsed<T>,
  store: (data: T) => Promise<void>,
): Promise<SettingsFormState> {
  await requireOwner();
  const parsed = parse(fd);
  if (!parsed.ok) {
    const values = Object.fromEntries([...fd].filter((e): e is [string, string] => typeof e[1] === "string"));
    return { error: parsed.error, values };
  }
  await store(parsed.data);
  revalidateSite();
  redirect("/admin/site?saved=1");
}

export async function saveHero(_prev: SettingsFormState, fd: FormData): Promise<SettingsFormState> {
  return save(fd, parseHeroForm, settings.saveHero);
}

export async function saveAbout(_prev: SettingsFormState, fd: FormData): Promise<SettingsFormState> {
  return save(fd, parseAboutForm, settings.saveAbout);
}

export async function saveWomen(_prev: SettingsFormState, fd: FormData): Promise<SettingsFormState> {
  return save(fd, parseWomenForm, settings.saveWomen);
}

export async function saveContacts(_prev: SettingsFormState, fd: FormData): Promise<SettingsFormState> {
  return save(fd, parseContactsForm, settings.saveContacts);
}

export async function saveRating(_prev: SettingsFormState, fd: FormData): Promise<SettingsFormState> {
  return save(fd, parseRatingForm, settings.saveRating);
}

export async function toggleBlock(fd: FormData): Promise<void> {
  await requireOwner();
  const block = text(fd, "block");
  if (isBlock(block)) await settings.toggleBlock(block);
  revalidateSite();
}
