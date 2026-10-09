"use client";

import { useActionState, useState } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
import { EyeIcon } from "@/components/icons";
import { changePassword, logoutEverywhere, type PasswordFormState } from "./actions";

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none transition placeholder:text-muted/60 focus:border-accent";
const labelCls = "mb-1.5 block text-sm text-muted";
const hint = "mt-1 block text-xs text-muted";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(changePassword, undefined);
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className={labelCls}>Текущий пароль</span>
        <input name="oldPassword" type={type} autoComplete="current-password" required className={field} />
      </label>

      <label className="block">
        <span className={labelCls}>Новый пароль</span>
        <input
          name="newPassword"
          type={type}
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          className={field}
        />
        <span className={hint}>Не короче {PASSWORD_MIN_LENGTH} символов.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Новый пароль ещё раз</span>
        <input
          name="repeatPassword"
          type={type}
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          className={field}
        />
      </label>

      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        className="flex items-center gap-2 py-1 text-sm text-muted hover:text-fg"
      >
        <EyeIcon />
        {show ? "Скрыть пароли" : "Показать пароли"}
      </button>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Меняем…" : "Сменить пароль"}
      </button>
    </form>
  );
}

export function LogoutEverywhereButton() {
  return (
    <form
      action={logoutEverywhere}
      onSubmit={(e) => {
        if (!window.confirm("Выйти на всех устройствах? Здесь тоже придётся войти заново.")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="w-full rounded-xl border border-line py-3.5 font-semibold text-fg transition hover:border-danger hover:text-danger"
      >
        Выйти на всех устройствах
      </button>
    </form>
  );
}
