import { z } from "zod";
import { optionalInt } from "@/lib/admin/form";

/** Результат проверки формы: либо нормализованные данные, либо первая ошибка для показа в форме. */
export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export function toParsed<T>(result: { success: true; data: T } | { success: false; error: z.ZodError }): Parsed<T> {
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "Проверьте поля формы" };
}

/** Строка из формы → целое число или null для пустой; мусор остаётся NaN и отсекается правилами ниже. */
export const intFromText = z.string().transform((raw) => optionalInt(raw));

/** Сообщить об ошибке внутри transform и прервать разбор. */
export function fail(ctx: z.RefinementCtx, message: string): never {
  ctx.addIssue({ code: "custom", message });
  return z.NEVER;
}
