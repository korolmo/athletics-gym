import { z } from "zod";
import { text } from "@/lib/admin/form";
import { normalizePhone } from "../domain/phone";
import { CLIENT_NAME_MAX, type LoginFormError } from "../domain/client";
import { isCodeShape } from "../domain/login-code.rules";
import { fail } from "@/lib/validation/shared";

// Формы входа в кабинет. Ошибки — кодами (LOGIN_FORM_ERRORS): кабинет двуязычный, текст берётся из словаря по коду.

type Result<T> = { ok: true; data: T } | { ok: false; error: LoginFormError };

const phone = z.string().transform((raw, ctx) => normalizePhone(raw) ?? fail(ctx, "phone"));

const name = z.string().min(1, { error: "name" }).max(CLIENT_NAME_MAX, { error: "nameLong" });

function first<T>(r: { success: true; data: T } | { success: false; error: z.ZodError }): Result<T> {
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: (r.error.issues[0]?.message ?? "phone") as LoginFormError };
}

/** Шаг 1: номер телефона. */
export function parseCodeRequest(fd: FormData): Result<{ phone: string }> {
  return first(z.object({ phone }).safeParse({ phone: text(fd, "phone") }));
}

export type CodeVerifyInput = {
  phone: string;
  code: string;
  /** Только при первом входе: имя и Согласие на обработку данных */
  profile: { name: string; consent: true } | null;
};

/**
 * Шаг 2: код и — если форма их показала (первый вход) — имя и Согласие.
 * Поля имени нет → profile = null; поле есть → имя и галочка обязательны.
 */
export function parseCodeVerify(fd: FormData): Result<CodeVerifyInput> {
  const base = z
    .object({
      phone,
      code: z.string().transform((raw, ctx) => {
        const clean = raw.replace(/\s/g, "");
        return isCodeShape(clean) ? clean : fail(ctx, "code");
      }),
    })
    .safeParse({ phone: text(fd, "phone"), code: text(fd, "code") });
  if (!base.success) return first(base);

  if (!fd.has("name")) return { ok: true, data: { ...base.data, profile: null } };
  const profile = z
    .object({
      name,
      consent: z.string().transform((raw, ctx) => (raw === "on" ? (true as const) : fail(ctx, "consent"))),
    })
    .safeParse({ name: text(fd, "name"), consent: text(fd, "consent") });
  if (!profile.success) return first(profile);
  return { ok: true, data: { ...base.data, profile: profile.data } };
}

/** Профиль: новое имя. */
export function parseProfile(fd: FormData): Result<{ name: string }> {
  return first(z.object({ name }).safeParse({ name: text(fd, "name") }));
}
