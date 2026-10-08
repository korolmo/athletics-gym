import { z } from "zod";
import { checked, text } from "@/lib/admin/form";
import { LIMITS } from "@/lib/admin/limits";
import { HALLS } from "@/lib/domain/tariff";
import { fail, toParsed, type Parsed } from "./shared";

const description = z
  .string()
  .max(LIMITS.description, { error: `Описание — не длиннее ${LIMITS.description} символов` })
  .transform((v) => v || null);

/** Тренер из формы админки. */
export const trainerSchema = z.object({
  id: z.string().transform((v) => v || null),
  name: z
    .string()
    .min(1, { error: "Заполните имя" })
    .max(LIMITS.name, { error: `Имя — не длиннее ${LIMITS.name} символов` }),
  hallId: z.enum(HALLS, { error: "Выберите зал" }),
  /** Пустое поле → null: «порядок не задан» */
  sortOrder: z.string().transform((raw, ctx) => {
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) return fail(ctx, "Порядок — целое число от 0");
    if (n > LIMITS.sortOrder) return fail(ctx, `Порядок — не больше ${LIMITS.sortOrder}`);
    return n;
  }),
  descriptionRu: description,
  descriptionKk: description,
  isVisible: z.boolean(),
});

export type TrainerInput = z.output<typeof trainerSchema>;

export function parseTrainerForm(fd: FormData): Parsed<TrainerInput> {
  return toParsed(
    trainerSchema.safeParse({
      id: text(fd, "id"),
      name: text(fd, "name"),
      hallId: text(fd, "hallId"),
      sortOrder: text(fd, "sortOrder"),
      descriptionRu: text(fd, "descriptionRu"),
      descriptionKk: text(fd, "descriptionKk"),
      isVisible: checked(fd, "isVisible"),
    }),
  );
}
