import { z } from "zod";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, passwordBytes } from "@/lib/auth/password-policy";
import { toParsed, type Parsed } from "./shared";

/** Смена пароля Владельца: текущий пароль и новый дважды. Пароли не обрезаем — пробелы в них значимы. */
export const passwordChangeSchema = z
  .object({
    oldPassword: z.string().min(1, { error: "Введите текущий пароль" }),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, { error: `Новый пароль — не короче ${PASSWORD_MIN_LENGTH} символов` })
      .refine((v) => passwordBytes(v) <= PASSWORD_MAX_BYTES, { error: "Новый пароль слишком длинный" }),
    repeatPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.repeatPassword, { error: "Новый пароль и его повтор не совпадают" })
  .refine((v) => v.newPassword !== v.oldPassword, { error: "Новый пароль совпадает с текущим" })
  .transform(({ oldPassword, newPassword }) => ({ oldPassword, newPassword }));

export type PasswordChangeInput = z.output<typeof passwordChangeSchema>;

export function parsePasswordChangeForm(fd: FormData): Parsed<PasswordChangeInput> {
  const raw = (key: string) => String(fd.get(key) ?? "");
  return toParsed(
    passwordChangeSchema.safeParse({
      oldPassword: raw("oldPassword"),
      newPassword: raw("newPassword"),
      repeatPassword: raw("repeatPassword"),
    }),
  );
}
