import { z } from "zod";
import { checked, text } from "@/lib/admin/form";
import { LIMITS } from "@/lib/admin/limits";
import { toParsed, type Parsed } from "./shared";

const caption = (lang: string) =>
  z
    .string()
    .max(LIMITS.caption, { error: `Подпись (${lang}) — не длиннее ${LIMITS.caption} символов` })
    .transform((v) => v || null);

/** Подпись и показ фото Галереи из формы админки. Подпись необязательна на обоих языках. */
export const galleryCaptionSchema = z.object({
  id: z.string().min(1, { error: "Фото не найдено. Вернитесь к списку." }),
  captionRu: caption("RU"),
  captionKk: caption("KZ"),
  isVisible: z.boolean(),
});

export type GalleryCaptionInput = z.output<typeof galleryCaptionSchema>;

export function parseGalleryCaptionForm(fd: FormData): Parsed<GalleryCaptionInput> {
  return toParsed(
    galleryCaptionSchema.safeParse({
      id: text(fd, "id"),
      captionRu: text(fd, "captionRu"),
      captionKk: text(fd, "captionKk"),
      isVisible: checked(fd, "isVisible"),
    }),
  );
}
