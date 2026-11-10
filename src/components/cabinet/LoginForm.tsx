"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { requestCodeAction, verifyCodeAction, type LoginState } from "@/app/[locale]/cabinet/actions";
import type { Locale } from "@/lib/i18n";
import type { CabinetDictionary } from "@/dictionaries/cabinet/ru";
import { logo } from "@/lib/brand";
import { formatPhone, CODE_LENGTH } from "@/modules/clients/client";
import { ArrowForwardSym, ChatSym } from "./icons";
import { ArrowBackSym, BadgeSym, ContentCopySym, ErrorSym, HistorySym, LockOpenSym, ScienceSym } from "./icons";
import { Pill, btnPrimary, cardLine, fieldLabel, input, waLink } from "./ui";
import { fill } from "./format";

/** Через сколько секунд можно запросить код ещё раз (лимит — 3 кода на номер за 15 минут). */
const RESEND_AFTER_SEC = 60;

function dispatch(prev: LoginState, fd: FormData): Promise<LoginState> {
  // «Отправить код ещё раз» — кнопка формы кода с resend=1: тот же запрос кода, но со второго шага
  return fd.get("intent") === "verify" && fd.get("resend") !== "1" ? verifyCodeAction(prev, fd) : requestCodeAction(prev, fd);
}

type Props = { locale: Locale; t: CabinetDictionary; demoPhones: string | null; waHref: string; privacyHref: string };

export function LoginForm({ locale, t, demoPhones, waHref, privacyHref }: Props) {
  const [state, action, pending] = useActionState<LoginState, FormData>(dispatch, { step: "phone" });
  // «Изменить номер» возвращает к первому шагу, пока сервер не ответит новым состоянием
  const [dismissed, setDismissed] = useState<LoginState | null>(null);
  const current: LoginState = dismissed === state ? { step: "phone" } : state;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[540px] flex-col px-4 pb-12 pt-6 md:justify-center md:pt-12">
      <Link href={`/${locale}`} className="mx-auto mb-6 hidden items-center gap-3 md:flex">
        <Image src={logo} alt="" width={36} height={36} className="h-9 w-9 object-contain" priority />
        <span className="text-label-uppercase uppercase tracking-[0.2em] text-text-muted">{t.brand.name}</span>
      </Link>

      {current.step === "phone" ? (
        <PhoneStep locale={locale} t={t} action={action} pending={pending} error={current.error} />
      ) : (
        <CodeStep
          key={current.sentAt}
          locale={locale}
          t={t}
          state={current}
          action={action}
          pending={pending}
          privacyHref={privacyHref}
          onChangePhone={() => setDismissed(state)}
        />
      )}

      {demoPhones && current.step === "phone" && (
        <div className="mt-6 flex gap-4 rounded-2xl bg-surface-card p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary-container">
            <ScienceSym className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[15px] font-extrabold uppercase tracking-wider text-primary-container">{t.login.demoTitle}</p>
            <p className="mt-1 text-body-md text-text-muted">
              {t.login.demoText.split("{phones}")[0]}
              <b className="font-bold text-text-primary">{demoPhones}</b>
              {t.login.demoText.split("{phones}")[1]}
            </p>
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <p className="text-body-md text-text-muted">{t.login.trouble}</p>
        <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${waLink} text-[17px]`}>
          <ChatSym className="h-6 w-6" />
          {t.login.writeWa}
        </a>
        <Link href={`/${locale}`} className="mt-2 inline-flex items-center gap-2 text-body-md text-text-muted transition hover:text-text-primary">
          <ArrowBackSym className="h-5 w-5" />
          {t.login.home}
        </Link>
      </div>
    </main>
  );
}

type Action = (fd: FormData) => void;

function PhoneStep({ locale, t, action, pending, error }: { locale: Locale; t: CabinetDictionary; action: Action; pending: boolean; error?: string }) {
  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-4 md:hidden">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high text-primary-container">
          <LockOpenSym className="h-9 w-9" />
          <span aria-hidden="true" className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-background bg-primary-container" />
        </span>
        <Pill>{t.badge}</Pill>
      </div>
      <form action={action} className={`${cardLine} bg-gradient-to-br from-surface-card to-surface-container-low text-center md:text-left`}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="intent" value="request" />
        <div className="mb-5 hidden md:block">
          <Pill>{t.badge}</Pill>
        </div>
        <h1 className="text-headline-lg-mobile font-extrabold uppercase text-text-primary">{t.login.title}</h1>
        <p className="mt-2 text-body-lg text-text-muted">{t.login.subtitle}</p>

        <div className="mt-8 flex items-baseline justify-between text-left">
          <label htmlFor="phone" className={fieldLabel}>
            {t.login.phone}
          </label>
          <span className="text-body-md text-text-muted">{t.login.phoneHint}</span>
        </div>
        <div className="mt-3 flex h-16 overflow-hidden rounded-xl border border-surface-border bg-surface-container-lowest focus-within:border-primary-container">
          <span className="flex w-20 items-center justify-center bg-surface-container-high text-[19px] font-bold text-text-primary">+7</span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            required
            placeholder={t.login.phonePlaceholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "phone-error" : undefined}
            className="min-w-0 flex-1 bg-transparent px-5 text-[19px] tracking-wide text-text-primary outline-none placeholder:text-text-muted/60"
          />
        </div>
        {error && (
          <p id="phone-error" role="alert" className="mt-3 flex items-start gap-2 text-left text-body-md text-[#ff6b6b]">
            <ErrorSym className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={`${btnPrimary} mt-6`}>
          {t.login.getCode}
          <ArrowForwardSym className="h-6 w-6" />
        </button>
        <p className="mt-5 text-center text-body-md text-text-muted">{t.login.note}</p>
      </form>
    </>
  );
}

type CodeState = Extract<LoginState, { step: "code" }>;

function CodeStep({
  locale,
  t,
  state,
  action,
  pending,
  privacyHref,
  onChangePhone,
}: {
  locale: Locale;
  t: CabinetDictionary;
  state: CodeState;
  action: Action;
  pending: boolean;
  privacyHref: string;
  onChangePhone: () => void;
}) {
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(RESEND_AFTER_SEC);
  const codeRef = useRef<HTMLInputElement>(null);
  const first = state.needsProfile === true;
  const hasError = Boolean(state.error);

  useEffect(() => {
    codeRef.current?.focus();
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const boxTone = hasError && !first ? "border-[#ef4444]" : first ? "border-primary-container/70 shadow-[0_0_12px_rgba(245,230,66,0.18)]" : "border-surface-border";

  return (
    <>
      <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <Pill small={first} className={first ? "border border-primary-container/40" : "mx-auto md:mx-0"}>
          {first ? t.badgeFirst : t.badge}
        </Pill>
        {first && <span className="shrink-0 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider text-primary-container sm:text-label-uppercase">{fill(t.step, { n: "02" })}</span>}
      </div>
      <form action={action} className={`${cardLine} ${first ? "text-left" : "text-center md:text-left"}`}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="phone" value={state.phone} />
        <h1 className="text-headline-lg-mobile font-extrabold uppercase text-text-primary">{t.code.title}</h1>
        <p className="mt-2 text-body-lg text-text-muted">
          {t.code.sentTo} <b className="font-bold text-text-primary">{formatPhone(state.phone)}</b> ·{" "}
          <button type="button" onClick={onChangePhone} className="text-primary-container underline underline-offset-4">
            {t.code.changePhone}
          </button>
        </p>

        <label htmlFor="code" className={`${fieldLabel} mt-7 block text-left`}>
          {t.code.label}
        </label>
        <div className="relative mt-3">
          <div aria-hidden="true" className="grid grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <span
                key={i}
                className={`flex aspect-[5/6] items-center justify-center rounded-xl border-2 bg-surface-container-lowest text-[30px] font-bold text-text-primary ${boxTone} ${
                  i === code.length ? "ring-2 ring-primary-container/40" : ""
                }`}
              >
                {code[i] ?? ""}
              </span>
            ))}
          </div>
          <input
            ref={codeRef}
            id="code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={CODE_LENGTH}
            maxLength={CODE_LENGTH}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={hasError ? "code-error" : undefined}
            className="absolute inset-0 h-full w-full cursor-text opacity-0"
          />
        </div>
        {state.error && (
          <p id="code-error" role="alert" className="mt-4 flex items-start gap-2 text-left text-body-md text-[#ff6b6b]">
            <ErrorSym className="mt-0.5 h-5 w-5 shrink-0" />
            {state.error}
          </p>
        )}

        <div className={`mt-5 flex ${first ? "justify-start" : "justify-center md:justify-start"}`}>
          {left > 0 ? (
            <p className="flex items-center gap-2 text-body-md text-text-muted">
              <HistorySym className="h-5 w-5" />
              {fill(t.code.resendIn, { time: `0:${String(left).padStart(2, "0")}` })}
            </p>
          ) : (
            <button
              type="submit"
              formNoValidate
              name="resend"
              value="1"
              className="flex items-center gap-2 text-body-md text-primary-container underline underline-offset-4"
            >
              <HistorySym className="h-5 w-5" />
              {t.code.resend}
            </button>
          )}
        </div>

        {first && (
          <>
            <div className="mt-7 flex items-center gap-3 text-label-uppercase uppercase tracking-[0.2em] text-text-muted">
              <span className="h-px flex-1 bg-surface-border" />
              {t.code.profile}
              <span className="h-px flex-1 bg-surface-border" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <label htmlFor="name" className={fieldLabel}>
                {t.code.name}
              </label>
              <span className="text-label-uppercase uppercase text-primary-container">{t.code.required}</span>
            </div>
            <div className="relative mt-3">
              <input id="name" name="name" required maxLength={60} autoComplete="given-name" placeholder={t.code.namePlaceholder} className={`${input} pr-12`} />
              <BadgeSym className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-text-muted" />
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-4 text-body-md text-text-muted">
              <input
                type="checkbox"
                name="consent"
                required
                className="mt-0.5 h-7 w-7 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-primary-container bg-transparent checked:bg-primary-container checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 -960 960 960%22><path fill=%22%23363100%22 d=%22M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z%22/></svg>')] bg-center bg-no-repeat"
              />
              <span>
                {t.code.consent}{" "}
                <a href={privacyHref} target="_blank" className="text-text-primary underline underline-offset-4">
                  {t.code.consentLink}
                </a>
              </span>
            </label>
          </>
        )}

        <button type="submit" disabled={pending} className={`${btnPrimary} mt-7`}>
          {first ? t.code.submitFirst : t.code.submit}
          <ArrowForwardSym className="h-6 w-6" />
        </button>
      </form>

      {state.shownCode && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-dashed border-primary-container/50 bg-surface-card p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary-container">
            <ScienceSym className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label-uppercase uppercase tracking-wider text-text-muted">{t.login.demoTitle}</p>
            <p className="whitespace-nowrap text-[24px] font-extrabold tracking-[0.12em] text-primary-container sm:text-[28px]">
              <span className="sr-only">{t.code.demoCode} </span>
              {state.shownCode.slice(0, 3)} {state.shownCode.slice(3)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCode(state.shownCode ?? "");
              codeRef.current?.focus();
            }}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-surface-border bg-background px-4 py-3 text-body-md font-semibold text-text-primary transition hover:border-primary-container"
          >
            <ContentCopySym className="h-5 w-5 text-primary-container" />
            {t.code.paste}
          </button>
        </div>
      )}
    </>
  );
}
