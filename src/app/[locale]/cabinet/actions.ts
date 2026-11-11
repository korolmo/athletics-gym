"use server";

import { redirect } from "next/navigation";
import { currentIpHash } from "@/lib/ip-hash";
import { getCabinetDictionary, isLocale, type Locale } from "@/lib/i18n";
import { logError } from "@/lib/observability/log";
import { LEGAL_UPDATED } from "@/modules/legal/client";
import {
  createClientSession,
  deleteClientAccount,
  destroyClientSession,
  parseCodeRequest,
  parseCodeVerify,
  parseProfile,
  requestLoginCode,
  requireClient,
  resolveCodeChannel,
  revokeAllClientSessions,
  updateClientName,
  verifyLoginCode,
} from "@/modules/clients";
import { canClientCancel, cancelMyBooking, cancelMyFutureBookings, createBooking, parseBookingForm, trainerBusy } from "@/modules/bookings";
import { getBookableTrainer } from "@/modules/trainers";
import { listWindows, sessionMinutesOf } from "@/modules/schedule";
import { fill } from "@/components/cabinet/format";
import { kickOutbox } from "@/app/outbox-kick";

/** Уведомление Владельцу — сразу после ответа Клиенту, не задерживая его; не ушло — заберёт попутная отправка. */
function notifyOwnerSoon(): void {
  kickOutbox({ force: true });
}

// Действия кабинета Клиента (этап 1). Тонкие: разбор формы и правила — в модулях Клиенты, Записи, Окна.
// Язык приходит скрытым полем формы: от него зависят тексты ошибок и адреса переходов.

function localeOf(fd: FormData): Locale {
  const raw = String(fd.get("locale") ?? "");
  return isLocale(raw) ? raw : "ru";
}

const loginPath = (locale: Locale) => `/${locale}/cabinet/login`;

// ——— Вход ———

export type LoginState =
  | { step: "phone"; error?: string }
  | { step: "code"; phone: string; shownCode?: string; needsProfile?: boolean; error?: string; sentAt: number };

export async function requestCodeAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const locale = localeOf(fd);
  const t = await getCabinetDictionary(locale);
  const parsed = parseCodeRequest(fd);
  if (!parsed.ok) return { step: "phone", error: t.errors.phone };
  const { phone } = parsed.data;
  try {
    const r = await requestLoginCode(phone, await currentIpHash(), resolveCodeChannel());
    if (r.ok) return { step: "code", phone, shownCode: r.shownCode, sentAt: Date.now() };
    const error = r.reason === "tooMany" ? fill(t.errors.tooMany, { min: r.retryAfterMin }) : t.errors[r.reason];
    // Повторная отправка со второго шага остаётся на нём
    if (fd.get("resend") === "1") return { step: "code", phone, error, sentAt: Date.now() };
    return { step: "phone", error };
  } catch (e) {
    logError("Кабинет: не удалось выдать код входа.", e);
    return { step: "phone", error: t.errors.unavailable };
  }
}

export async function verifyCodeAction(prev: LoginState, fd: FormData): Promise<LoginState> {
  const locale = localeOf(fd);
  const t = await getCabinetDictionary(locale);
  if (prev.step !== "code") return prev;
  const parsed = parseCodeVerify(fd);
  if (!parsed.ok) return { ...prev, error: t.errors[parsed.error] };
  let session: { clientId: string; version: number };
  try {
    const r = await verifyLoginCode(parsed.data, LEGAL_UPDATED.privacy);
    if (!r.ok) {
      if (r.reason === "needsProfile") return { ...prev, needsProfile: true, error: undefined };
      const error = r.reason === "wrongCode" ? fill(t.errors.wrongCode, { left: r.attemptsLeft }) : t.errors[r.reason];
      return { ...prev, error };
    }
    session = { clientId: r.clientId, version: r.sessionVersion };
  } catch (e) {
    logError("Кабинет: не удалось проверить код входа.", e);
    return { ...prev, error: t.errors.unavailable };
  }
  await createClientSession(session.clientId, session.version);
  redirect(`/${locale}/cabinet`);
}

// ——— Профиль ———

export type ProfileState = { ok?: boolean; error?: string } | undefined;

export async function updateNameAction(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const locale = localeOf(fd);
  await requireClient(loginPath(locale));
  const t = await getCabinetDictionary(locale);
  const parsed = parseProfile(fd);
  if (!parsed.ok) return { error: t.errors[parsed.error] };
  await updateClientName(parsed.data.name);
  return { ok: true };
}

export async function logoutAction(fd: FormData): Promise<void> {
  await destroyClientSession();
  redirect(loginPath(localeOf(fd)));
}

export async function logoutAllAction(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  await requireClient(loginPath(locale));
  await revokeAllClientSessions();
  await destroyClientSession();
  redirect(loginPath(locale));
}

/** Удаление аккаунта: сначала освобождаем Окна будущих Записей, затем стираем Клиента (прошедшие Записи обезличит база). */
export async function deleteAccountAction(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  await requireClient(loginPath(locale));
  await cancelMyFutureBookings();
  await deleteClientAccount();
  await destroyClientSession();
  redirect(`/${locale}`);
}

// ——— Записи ———

export type WindowsResult = { sessionMinutes: number; windows: { start: string; end: string }[] };

/** Свободные Окна Тренера на 14 дней — для экрана записи. Только для вошедшего Клиента. */
export async function windowsAction(locale: Locale, trainerId: string): Promise<WindowsResult> {
  await requireClient(loginPath(isLocale(locale) ? locale : "ru"));
  if (!(await getBookableTrainer(trainerId))) return { sessionMinutes: 60, windows: [] };
  const now = new Date();
  const [windows, sessionMinutes] = await Promise.all([listWindows(trainerId, await trainerBusy(trainerId, now), now), sessionMinutesOf(trainerId)]);
  return { sessionMinutes, windows: windows.map((w) => ({ start: w.start.toISOString(), end: w.end.toISOString() })) };
}

export type BookState =
  | { status: "idle" }
  | { status: "ok"; start: string; end: string; trainerId: string; /** Клиент ещё может отменить сам (время — сервера, не браузера) */ cancelable: boolean }
  | { status: "taken" | "limit"; start?: string; trainerId?: string }
  | { status: "error"; message: string };

export async function bookAction(_prev: BookState, fd: FormData): Promise<BookState> {
  const locale = localeOf(fd);
  await requireClient(loginPath(locale));
  const t = await getCabinetDictionary(locale);
  const parsed = parseBookingForm(fd);
  if (!parsed.ok) return { status: "error", message: t.result.badRequest };
  const r = await createBooking(parsed.data);
  if (r.ok && !r.repeated) notifyOwnerSoon();
  if (r.ok) {
    return {
      status: "ok",
      start: r.booking.startAt.toISOString(),
      end: r.booking.endAt.toISOString(),
      trainerId: parsed.data.trainerId,
      cancelable: canClientCancel({ status: "ACTIVE", startAt: r.booking.startAt }, new Date()),
    };
  }
  if (r.error === "taken" || r.error === "limit") return { status: r.error, start: parsed.data.startAt.toISOString(), trainerId: parsed.data.trainerId };
  return { status: "error", message: r.error === "noTrainer" ? t.result.noTrainer : t.result.badRequest };
}

export async function cancelBookingAction(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  await requireClient(loginPath(locale));
  const cancelled = await cancelMyBooking(String(fd.get("bookingId") ?? ""));
  if (cancelled.ok) notifyOwnerSoon();
  redirect(`/${locale}/cabinet`);
}
