"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { login, type LoginState } from "../actions";
import { EyeIcon } from "@/components/icons";
import { logo } from "@/lib/brand";

const input =
  "w-full rounded-xl border border-line bg-card px-4 py-3.5 text-base outline-none transition placeholder:text-muted/60 focus:border-accent";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Image src={logo} alt="Athletic's Gym" width={88} height={88} className="mx-auto rounded-full" priority />
      <h1 className="mt-6 text-center font-display text-3xl uppercase tracking-wide">Вход в админку</h1>

      <form action={action} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Логин</span>
          <input name="login" autoComplete="username" required className={input} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Пароль</span>
          <div className="relative">
            <input
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              className={`${input} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Скрыть пароль" : "Показать пароль"}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-fg"
            >
              <EyeIcon />
            </button>
          </div>
        </label>

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
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">Только для сотрудников Athletic&apos;s Gym</p>
    </main>
  );
}
