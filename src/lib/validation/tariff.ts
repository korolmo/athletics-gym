import { z } from "zod";
import { checked, text } from "@/lib/admin/form";
import { LIMITS } from "@/lib/admin/limits";
import { ACCESS, AUDIENCES, CATEGORY_FIELDS, CATEGORY_ORDER, HALLS } from "@/lib/domain/tariff";
import { fail, intFromText, toParsed, type Parsed } from "./shared";

/**
 * Тариф из формы админки — единственное место, где описано, какие значения допустимы.
 * Поля, которых у Категории нет (CATEGORY_FIELDS), не сохраняются, даже если пришли из формы.
 */
export const tariffSchema = z
  .object({
    id: z.string(),
    category: z.enum(CATEGORY_ORDER, { error: "Выберите категорию" }),
    hallId: z.enum(HALLS, { error: "Выберите зал" }),
    trainerId: z.string(),
    titleRu: z.string(),
    titleKk: z.string(),
    visitsPerMonth: intFromText,
    durationMonths: intFromText,
    access: z.string(),
    audience: z.string(),
    price: intFromText,
    priceTo: intFromText,
    isVisible: z.boolean(),
  })
  .transform((raw, ctx) => {
    const fields = CATEGORY_FIELDS[raw.category];

    const price = raw.price;
    if (price === null || !Number.isInteger(price) || price < 0) {
      return fail(ctx, "Цена — целое число в тенге, например 12000");
    }
    if (price > LIMITS.price) return fail(ctx, `Цена не больше ${LIMITS.price} ₸`);

    let priceTo: number | null = null;
    if (fields.priceTo) {
      priceTo = raw.priceTo;
      if (priceTo !== null && (!Number.isInteger(priceTo) || priceTo <= price)) {
        return fail(ctx, "Верхняя граница диапазона должна быть больше цены");
      }
      if (priceTo !== null && priceTo > LIMITS.price) return fail(ctx, `Цена не больше ${LIMITS.price} ₸`);
    }

    let visitsPerMonth: number | null = null;
    if (fields.visits) {
      visitsPerMonth = raw.visitsPerMonth;
      if (visitsPerMonth === null && raw.category === "VISITS") return fail(ctx, "Укажите число посещений в месяц");
      if (visitsPerMonth !== null && (!Number.isInteger(visitsPerMonth) || visitsPerMonth < 1)) {
        return fail(ctx, "Число в месяц — целое, от 1");
      }
      if (visitsPerMonth !== null && visitsPerMonth > LIMITS.visitsPerMonth) {
        return fail(ctx, `Число в месяц — не больше ${LIMITS.visitsPerMonth}`);
      }
    }

    let durationMonths: number | null = null;
    if (fields.months) {
      durationMonths = raw.durationMonths;
      if (durationMonths === null || !Number.isInteger(durationMonths) || durationMonths < 1) {
        return fail(ctx, "Срок — целое число месяцев, от 1");
      }
      if (durationMonths > LIMITS.durationMonths) return fail(ctx, `Срок — не больше ${LIMITS.durationMonths} месяцев`);
    }

    const access = z.enum(ACCESS).safeParse(fields.access ? raw.access : "FULL");
    if (!access.success) return fail(ctx, "Выберите время доступа");
    const audience = z.enum(AUDIENCES).safeParse(fields.audience ? raw.audience : "ALL");
    if (!audience.success) return fail(ctx, "Выберите аудиторию");

    // Персональные тренировки — только у Тренеров; остальные Категории — только в прайсе Зала
    const trainerId = fields.trainer ? raw.trainerId || null : null;
    if (fields.trainer && !trainerId) return fail(ctx, "Персональный тариф добавляется в карточке тренера");

    const titleRu = fields.title ? raw.titleRu || null : null;
    const titleKk = fields.title ? raw.titleKk || null : null;
    if ((titleRu?.length ?? 0) > LIMITS.title || (titleKk?.length ?? 0) > LIMITS.title) {
      return fail(ctx, `Уточнение — не длиннее ${LIMITS.title} символов`);
    }

    return {
      id: raw.id || null,
      hallId: raw.hallId,
      trainerId,
      category: raw.category,
      titleRu,
      titleKk,
      visitsPerMonth,
      durationMonths,
      access: access.data,
      audience: audience.data,
      price,
      priceTo,
      isVisible: raw.isVisible,
    };
  });

export type TariffInput = z.output<typeof tariffSchema>;

export function parseTariffForm(fd: FormData): Parsed<TariffInput> {
  return toParsed(
    tariffSchema.safeParse({
      id: text(fd, "id"),
      category: text(fd, "category"),
      hallId: text(fd, "hallId"),
      trainerId: text(fd, "trainerId"),
      titleRu: text(fd, "titleRu"),
      titleKk: text(fd, "titleKk"),
      visitsPerMonth: text(fd, "visitsPerMonth"),
      durationMonths: text(fd, "durationMonths"),
      access: text(fd, "access"),
      audience: text(fd, "audience"),
      price: text(fd, "price"),
      priceTo: text(fd, "priceTo"),
      isVisible: checked(fd, "isVisible"),
    }),
  );
}
