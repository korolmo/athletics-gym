import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/admin/guard";
import { SHOW_COLUMN, type BlockId, type SiteSettingsData } from "@/lib/domain/site-settings";
import { DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import type { AboutInput, ContactsInput, HeroInput, RatingInput, WomenInput } from "@/lib/validation/site-settings";
import { SETTINGS_ID, getSiteSettings } from "./site";

// Настройки сайта в админке. Каждая функция сама проверяет сессию Владельца.

/** Настройки и карточки «О зале» для раздела «Сайт». */
export async function getSettingsForEdit() {
  await requireOwner();
  return getSiteSettings();
}

/** Запись Настроек одна; если её нет (пустая база), создаём из начальных значений вместе с правкой. */
async function update(data: Partial<SiteSettingsData>): Promise<void> {
  await db.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS, ...data },
  });
}

export async function saveHero(input: HeroInput): Promise<void> {
  await requireOwner();
  await update(input);
}

export async function saveWomen(input: WomenInput): Promise<void> {
  await requireOwner();
  await update(input);
}

export async function saveContacts(input: ContactsInput): Promise<void> {
  await requireOwner();
  await update(input);
}

export async function saveRating(input: RatingInput): Promise<void> {
  await requireOwner();
  await update(input);
}

/** Четыре карточки «О зале» сохраняются вместе: место карточки — её номер в форме. */
export async function saveAbout(input: AboutInput): Promise<void> {
  await requireOwner();
  await db.$transaction(
    input.cards.map((card, i) =>
      db.aboutCard.upsert({
        where: { position: i + 1 },
        update: card,
        create: { position: i + 1, ...card },
      }),
    ),
  );
}

/** Переключает «показывать на сайте» у Блока главной. */
export async function toggleBlock(block: BlockId): Promise<void> {
  await requireOwner();
  const column = SHOW_COLUMN[block];
  const current = await db.siteSettings.findUnique({ where: { id: SETTINGS_ID }, select: { [column]: true } });
  const shown = (current as Record<string, boolean> | null)?.[column] ?? DEFAULT_SETTINGS[column];
  await update({ [column]: !shown });
}
