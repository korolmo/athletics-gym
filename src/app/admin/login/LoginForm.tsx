"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { login, type LoginState } from "../actions";
import { AlertIcon, ArrowRightIcon, EyeIcon, UserIcon } from "@/components/icons";
import { logo } from "@/lib/brand";
import { btnPrimary, field, label } from "../ui";

// Вход в админку — по макету Stitch А1 (design/stitch/admin/a1-vhod-desktop.png). «Запомнить вход» из макета нет:
// сессия Владельца и так живёт неделю, а второй срок — второе правило без пользы.

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
    </svg>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-card px-6 py-8 shadow-2xl sm:px-10 sm:py-10">
        <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <Image src={logo} alt="Athletic's Gym" width={80} height={80} className="mx-auto rounded-full ring-4 ring-bg" priority />
        <h1 className="mt-5 text-center text-2xl font-extrabold">Вход в админку</h1>
        <p className="mt-1 text-center text-sm text-muted">Панель управления клубом</p>

        <form action={action} className="mt-8 space-y-5">
          <label className="block">
            <span className={label}>Логин</span>
            <span className="relative block">
              <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input name="login" autoComplete="username" required className={`${field} pl-12`} />
            </span>
          </label>
          <label className="block">
            <span className={label}>Пароль</span>
            <span className="relative block">
              <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                className={`${field} px-12`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-fg"
              >
                <EyeIcon />
              </button>
            </span>
          </label>

          <button type="submit" disabled={pending} className={`${btnPrimary} w-full normal-case text-lg tracking-normal`}>
            {pending ? "Входим…" : "Войти"}
            {!pending && <ArrowRightIcon className="h-5 w-5" />}
          </button>

          {state?.error && (
            <p role="alert" className="flex items-center gap-3 rounded-xl border border-danger/50 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
              <AlertIcon className="h-5 w-5 shrink-0" />
              {state.error}
            </p>
          )}
        </form>

        <p className="mt-8 flex items-center justify-center gap-2 border-t border-line pt-6 text-sm text-muted">
          <ShieldIcon className="h-4 w-4" />
          Только для владельца Athletic&apos;s Gym
        </p>
      </div>
      <p className="mt-6 text-sm text-muted">Athletic&apos;s Gym · Кызылорда</p>
    </main>
  );
}
