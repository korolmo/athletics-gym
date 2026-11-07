"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccountAction, logoutAction, logoutAllAction, updateNameAction, type ProfileState } from "@/app/[locale]/cabinet/actions";
import type { Locale } from "@/lib/i18n";
import type { CabinetDictionary } from "@/dictionaries/cabinet/ru";
import { CallSym, CheckCircleSym } from "./icons";
import { DeleteSym, DevicesSym, EditSym, InfoSym, LogoutSym, PersonSym, PowerSettingsNewSym, SaveSym, ShieldSym, VerifiedSym, WarningSym } from "./icons";
import { btnDark, btnPrimary, card, fieldLabel, input } from "./ui";

type Props = { locale: Locale; t: CabinetDictionary; name: string; phone: string; privacyHref: string; termsHref: string };

function Pending({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {children}
    </button>
  );
}

/** Профиль по макету 15; удаление — с подтверждением по макету 14 (нативный dialog: фокус и Esc — браузер). */
export function ProfileView({ locale, t, name, phone, privacyHref, termsHref }: Props) {
  const [state, action] = useActionState<ProfileState, FormData>(updateNameAction, undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const p = t.profile;

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container text-[28px] font-extrabold text-on-primary">
          {name.trim().charAt(0).toUpperCase()}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-background bg-whatsapp-green text-background">
            <CheckCircleSym className="h-4 w-4" />
          </span>
        </span>
        <div>
          <h1 className="text-headline-lg-mobile font-extrabold uppercase text-text-primary">{p.title}</h1>
          <p className="text-body-md text-text-muted">{p.subtitle}</p>
        </div>
      </div>

      <form action={action} className={`${card} mt-6`}>
        <input type="hidden" name="locale" value={locale} />
        <h2 className="flex items-center gap-3 text-headline-sm uppercase text-text-primary">
          <PersonSym className="h-6 w-6 text-primary-container" />
          {p.personal}
        </h2>
        <label htmlFor="name" className={`${fieldLabel} mt-6 block`}>
          {p.name}
        </label>
        <div className="relative mt-2">
          <input id="name" name="name" defaultValue={name} required maxLength={60} autoComplete="given-name" className={`${input} pr-12`} />
          <EditSym className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
        </div>
        <div className="mt-5 flex items-baseline justify-between">
          <span className={fieldLabel}>{p.phone}</span>
          <span className="flex items-center gap-1 text-body-sm text-text-muted">
            <VerifiedSym className="h-4 w-4" />
            {p.phoneVerified}
          </span>
        </div>
        <div className="mt-2 flex h-14 items-center gap-3 rounded-xl border border-surface-border bg-surface-container-lowest px-4 text-body-lg text-text-primary">
          <CallSym className="h-5 w-5 text-text-muted" />
          <span className="flex-1">{phone}</span>
          <VerifiedSym className="h-5 w-5 text-text-muted" />
        </div>
        <p className="mt-2 flex items-start gap-2 text-body-sm text-text-muted">
          <InfoSym className="h-4 w-4 shrink-0" />
          {p.phoneFixed}
        </p>
        {state?.error && (
          <p role="alert" className="mt-4 text-body-md text-[#ff6b6b]">
            {state.error}
          </p>
        )}
        <Pending className={`${btnPrimary} mt-6`}>
          <SaveSym className="h-6 w-6" />
          {state?.ok ? p.saved : p.save}
        </Pending>
      </form>

      <section className={`${card} mt-4`}>
        <h2 className="flex items-center gap-3 text-headline-sm uppercase text-text-primary">
          <ShieldSym className="h-6 w-6 text-primary-container" />
          {p.security}
        </h2>
        <form action={logoutAction} className="mt-5">
          <input type="hidden" name="locale" value={locale} />
          <Pending className={btnDark}>
            <LogoutSym className="h-5 w-5" />
            {p.logout}
          </Pending>
        </form>
        <form action={logoutAllAction} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <Pending className={btnDark}>
            <DevicesSym className="h-5 w-5" />
            {p.logoutAll}
          </Pending>
        </form>
        <p className="mt-3 flex items-start gap-2 text-body-md text-text-muted">
          <PowerSettingsNewSym className="mt-0.5 h-5 w-5 shrink-0" />
          {p.logoutAllNote}
        </p>
      </section>

      <section className={`${card} mt-4 border-t-4 border-[#ef4444]`}>
        <h2 className="flex items-center gap-3 text-headline-sm uppercase text-[#ff6b6b]">
          <DeleteSym className="h-6 w-6" />
          {p.delete}
        </h2>
        <p className="mt-3 text-body-md text-text-muted">{p.deleteText}</p>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#3a1416] text-[15px] font-bold uppercase tracking-wide text-[#ff8a80] transition hover:bg-[#4a1a1d]"
        >
          <WarningSym className="h-5 w-5" />
          {p.delete}
        </button>
      </section>

      <p className="mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-body-md text-text-muted">
        <Link href={privacyHref} className="hover:text-text-primary">
          {p.privacy}
        </Link>
        <span aria-hidden="true">·</span>
        <Link href={termsHref} className="hover:text-text-primary">
          {p.terms}
        </Link>
      </p>

      <dialog
        ref={dialog}
        aria-labelledby="delete-title"
        className="m-auto w-[calc(100%-2rem)] max-w-[440px] rounded-3xl bg-gradient-to-b from-[#3a1d20] to-surface-card p-6 text-center text-text-primary backdrop:bg-black/75"
      >
        <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#ef4444]/25">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ef4444] text-white">
            <WarningSym className="h-8 w-8" />
          </span>
        </span>
        <h2 id="delete-title" className="mt-5 text-headline-md uppercase">
          {p.deleteTitle}
        </h2>
        <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#5a1a1d] px-4 py-1 text-label-uppercase uppercase tracking-wider text-[#ff8a80]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
          {p.deleteBadge}
        </span>
        <p className="mt-4 text-body-lg text-on-surface-variant">{p.deleteDialog}</p>
        <form action={deleteAccountAction} className="mt-6">
          <input type="hidden" name="locale" value={locale} />
          <Pending className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#ef4444] text-[17px] font-extrabold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-60">
            <DeleteSym className="h-6 w-6" />
            {p.deleteYes}
          </Pending>
        </form>
        <button type="button" onClick={() => dialog.current?.close()} className={`${btnDark} mt-3 h-14 normal-case`}>
          {p.deleteNo}
        </button>
      </dialog>
    </>
  );
}
