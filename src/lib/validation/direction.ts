import { z } from "zod";
import { checked, text } from "@/lib/admin/form";
import { DIRECTION_ICONS, DIRECTION_LIMITS } from "@/lib/domain/direction";
import { toParsed, type Parsed } from "./shared";

const { title, description } = DIRECTION_LIMITS;
const optional = (name: string, max: number) =>
  z
    .string()
    .max(max, { error: `${name} — не длиннее ${max} символов` })
    .transform((v) => v || null);

/** Направление из формы админки. RU обязателен, KZ необязателен; описание необязательно на обоих языках. */
export const directionSchema = z.object({
  id: z.string().transform((v) => v || null),
  titleRu: z
    .string()
    .min(1, { error: "Заполните название на русском" })
    .max(title, { error: `Название — не длиннее ${title} символов` }),
  titleKk: optional("Название (KZ)", title),
  descriptionRu: optional("Описание", description),
  descriptionKk: optional("Описание (KZ)", description),
  icon: z.enum(DIRECTION_ICONS, { error: "Выберите иконку из набора" }),
  isVisible: z.boolean(),
});
export type DirectionInput = z.output<typeof directionSchema>;

export function parseDirectionForm(fd: FormData): Parsed<DirectionInput> {
  return toParsed(
    directionSchema.safeParse({
      id: text(fd, "id"),
      titleRu: text(fd, "titleRu"),
      titleKk: text(fd, "titleKk"),
      descriptionRu: text(fd, "descriptionRu"),
      descriptionKk: text(fd, "descriptionKk"),
      icon: text(fd, "icon"),
      isVisible: checked(fd, "isVisible"),
    }),
  );
}
