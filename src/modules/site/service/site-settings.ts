import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { requireOwner } from "@/modules/owner";
import { SHOW_COLUMN, settingsToRow, type BlockId, type SiteSettingsData } from "../domain/site-settings";
import { DEFAULT_SETTINGS } from "../domain/site-settings.defaults";
import type { AboutInput, ContactsInput, HeroInput, LegalInput, MarqueeInput, RatingInput, WomenInput } from "../validation/site-settings";
import { getSiteSettings, settingsRowId } from "./settings";

// Настройки сайта в админке. Каждая функция сама проверяет сессию Владельца.

/** Настройки и карточки «О зале» для раздела «Сайт». */
export async function getSettingsForEdit(clubId: string) {
  await requireOwner();
  return getSiteSettings(clubId);
}

/** Запись Настроек одна; если её нет (пустая база), создаём из начальных значений вместе с правкой. */
async function update(clubId: string, data: Partial<SiteSettingsData>): Promise<void> {
  await dbFor(clubId).siteSettings.upsert({
    where: { clubId },
    update: settingsToRow(data),
    create: { id: settingsRowId(clubId), ...settingsToRow({ ...DEFAULT_SETTINGS, ...data }) },
  });
}

export async function saveHero(clubId: string, input: HeroInput): Promise<void> {
  await requireOwner();
  await update(clubId, input);
}

export async function saveMarquee(clubId: string, input: MarqueeInput): Promise<void> {
  await requireOwner();
  await update(clubId, input);
}

export async function saveWomen(clubId: string, input: WomenInput): Promise<void> {
  await requireOwner();
  await update(clubId, input);
}

export async function saveContacts(clubId: string, input: ContactsInput): Promise<void> {
  await requireOwner();
  await update(clubId, input);
}

export async function saveRating(clubId: string, input: RatingInput): Promise<void> {
  await requireOwner();
  await update(clubId, input);
}

/** Реквизиты и место хранения данных: видны в подвале сайта и на юридических страницах. */
export async function saveLegal(clubId: string, input: LegalInput): Promise<void> {
  await requireOwner();
  await update(clubId, input);
}

/** Четыре карточки «О зале» сохраняются вместе: место карточки — её номер в форме. */
export async function saveAbout(clubId: string, input: AboutInput): Promise<void> {
  await requireOwner();
  await dbFor(clubId).$transaction(
    input.cards.map((card, i) =>
      dbFor(clubId).aboutCard.upsert({
        where: { clubId_position: { clubId, position: i + 1 } },
        update: card,
        create: { clubId, position: i + 1, ...card },
      }),
    ),
  );
}

/** Переключает «показывать на сайте» у Блока главной. */
export async function toggleBlock(clubId: string, block: BlockId): Promise<void> {
  await requireOwner();
  const column = SHOW_COLUMN[block];
  const current = await dbFor(clubId).siteSettings.findUnique({ where: { clubId }, select: { [column]: true } });
  const shown = (current as Record<string, boolean> | null)?.[column] ?? DEFAULT_SETTINGS[column];
  await update(clubId, { [column]: !shown });
}
