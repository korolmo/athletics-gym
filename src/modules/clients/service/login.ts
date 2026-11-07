import crypto from "node:crypto";
import { db } from "@/lib/db";
import {
  CODE_KEEP_MS,
  CODE_LENGTH,
  CODE_TTL_MS,
  IP_WINDOW_MS,
  MAX_CODES_PER_IP,
  MAX_CODES_PER_PHONE,
  MAX_CODE_ATTEMPTS,
  PHONE_WINDOW_MS,
  evaluateRequests,
} from "../domain/login-code.rules";
import type { CodeChannel } from "./code-channel";
import type { CodeVerifyInput } from "../validation/login";

// Вход Клиента по телефону и одноразовому коду (ADR 0016). Ошибка базы пробрасывается наверх:
// без работающего лимита кодов вход запрещён — так же, как у Владельца.

export type CodeRequestResult =
  | { ok: true; shownCode?: string }
  | { ok: false; reason: "unavailable" | "phoneNotAllowed" }
  | { ok: false; reason: "tooMany"; retryAfterMin: number };

function hashCode(phone: string, code: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`client-code:${phone}:${code}`).digest("hex");
}

function newCode(): string {
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** Шаг 1: выдать код. Канал передаёт слой приложения (resolveCodeChannel); null — вход закрыт. */
export async function requestLoginCode(
  phone: string,
  ipHash: string,
  channel: CodeChannel | null,
  now: Date = new Date(),
): Promise<CodeRequestResult> {
  if (!channel) return { ok: false, reason: "unavailable" };
  if (!channel.accepts(phone)) return { ok: false, reason: "phoneNotAllowed" };

  const recent = await db.clientLoginCode.findMany({
    where: { OR: [{ phone }, { ipHash }], createdAt: { gt: new Date(now.getTime() - Math.max(PHONE_WINDOW_MS, IP_WINDOW_MS)) } },
    select: { phone: true, ipHash: true, createdAt: true },
  });
  for (const limit of [
    evaluateRequests(recent.filter((r) => r.phone === phone).map((r) => r.createdAt), now, MAX_CODES_PER_PHONE, PHONE_WINDOW_MS),
    evaluateRequests(recent.filter((r) => r.ipHash === ipHash).map((r) => r.createdAt), now, MAX_CODES_PER_IP, IP_WINDOW_MS),
  ]) {
    if (limit.blocked) return { ok: false, reason: "tooMany", retryAfterMin: limit.retryAfterMin };
  }

  const code = newCode();
  await db.clientLoginCode.create({
    data: { phone, ipHash, codeHash: hashCode(phone, code), expiresAt: new Date(now.getTime() + CODE_TTL_MS), createdAt: now },
  });
  await db.clientLoginCode.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - CODE_KEEP_MS) } } });

  const delivery = await channel.deliver(phone, code);
  if (!delivery.delivered) return { ok: false, reason: "unavailable" };
  return { ok: true, shownCode: delivery.shownCode };
}

export type CodeVerifyResult =
  | { ok: true; clientId: string; sessionVersion: number; created: boolean }
  /** Код верный, но Клиента ещё нет: форма должна спросить имя и Согласие. Код не расходуется */
  | { ok: false; reason: "needsProfile" }
  | { ok: false; reason: "wrongCode" | "expired" | "tooManyAttempts" };

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Шаг 2: проверить код. Действует только последний выданный и непросроченный код номера; после MAX_CODE_ATTEMPTS
 * неверных вводов он сгорает. Верный код расходуется удалением строки — повтор с тем же кодом не войдёт.
 * Новый Клиент создаётся только с именем и Согласием (`policyDate` — дата редакции Политики, её передаёт слой приложения).
 */
export async function verifyLoginCode(input: CodeVerifyInput, policyDate: string, now: Date = new Date()): Promise<CodeVerifyResult> {
  const { phone, code, profile } = input;
  const row = await db.clientLoginCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt <= now) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "tooManyAttempts" };

  if (!sameHash(row.codeHash, hashCode(phone, code))) {
    await db.clientLoginCode.updateMany({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: row.attempts + 1 >= MAX_CODE_ATTEMPTS ? "tooManyAttempts" : "wrongCode" };
  }

  const existing = await db.client.findUnique({ where: { phone }, select: { id: true, sessionVersion: true } });
  if (!existing && !profile) return { ok: false, reason: "needsProfile" };

  // Код одноразовый: расходует его тот, чьё удаление сработало
  const { count } = await db.clientLoginCode.deleteMany({ where: { id: row.id } });
  if (count === 0) return { ok: false, reason: "expired" };
  await db.clientLoginCode.deleteMany({ where: { phone } });

  if (existing) {
    await db.client.update({ where: { id: existing.id }, data: { lastLoginAt: now } });
    return { ok: true, clientId: existing.id, sessionVersion: existing.sessionVersion, created: false };
  }
  if (profile?.consent !== true) throw new Error("Клиент без Согласия на обработку данных не создаётся.");
  const created = await db.client.create({
    data: { phone, name: profile.name, consentAt: now, consentPolicyDate: policyDate, lastLoginAt: now },
    select: { id: true, sessionVersion: true },
  });
  return { ok: true, clientId: created.id, sessionVersion: created.sessionVersion, created: true };
}
