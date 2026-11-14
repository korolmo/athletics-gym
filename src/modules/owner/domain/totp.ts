// Двухфакторный вход Владельца (этап 2, ADR 0024): одноразовые коды по RFC 4226 (HOTP) и RFC 6238 (TOTP), секрет
// в base32 (RFC 4648) для приложений-аутентификаторов, ссылка otpauth:// для QR-кода. Своя реализация на node:crypto:
// зависимость ради ~40 строк не нужна (как свой отправщик Sentry, ADR 0010). Проверено векторами из обоих RFC.
// Только сервер: в client.ts не экспортируется (node:crypto).
import { createHmac, randomBytes } from "node:crypto";

export type TotpAlgorithm = "sha1" | "sha256" | "sha512";

/** Как в Google Authenticator и остальных: 6 цифр, шаг 30 секунд, SHA-1. */
export const TOTP_DIGITS = 6;
export const TOTP_STEP_SEC = 30;
/** Допуск часов телефона: ±1 шаг (решение 12 этапа 2). */
export const TOTP_WINDOW = 1;
/** 20 байт = 160 бит — длина ключа HMAC-SHA1 по RFC 4226. */
export const TOTP_SECRET_BYTES = 20;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** base32 без выравнивания «=» — так секрет вводят в приложение руками. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** base32 → байты; регистр, пробелы, дефисы и «=» не важны. Чужой символ — null. */
export function base32Decode(text: string): Buffer | null {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = BASE32.indexOf(ch);
    if (i < 0) return null;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** HOTP (RFC 4226, разд. 5.3): HMAC от 8-байтного счётчика, динамическое усечение, `digits` младших цифр. */
export function hotp(secret: Uint8Array, counter: number, digits = TOTP_DIGITS, algorithm: TotpAlgorithm = "sha1"): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac(algorithm, secret).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** Номер шага времени (RFC 6238): сколько полных шагов прошло с 1970-01-01 UTC. */
export function timeStep(nowMs: number, stepSec = TOTP_STEP_SEC): number {
  return Math.floor(nowMs / 1000 / stepSec);
}

/** TOTP (RFC 6238): HOTP от номера шага времени. */
export function totp(secret: Uint8Array, nowMs: number, opts: { digits?: number; stepSec?: number; algorithm?: TotpAlgorithm } = {}): string {
  return hotp(secret, timeStep(nowMs, opts.stepSec), opts.digits, opts.algorithm);
}

/**
 * Проверка кода с допуском ±window шагов. Возвращает номер шага, на котором код совпал (его сервис запоминает и не
 * принимает повторно — защита от повторного ввода того же кода), или null. `afterStep` — последний принятый шаг:
 * коды не новее него отклоняются.
 */
export function verifyTotp(
  secret: Uint8Array,
  code: string,
  nowMs: number,
  opts: { window?: number; afterStep?: number | null; digits?: number; stepSec?: number } = {},
): number | null {
  const digits = opts.digits ?? TOTP_DIGITS;
  const clean = code.replace(/\s/g, "");
  if (!new RegExp(`^\\d{${digits}}$`).test(clean)) return null;
  const now = timeStep(nowMs, opts.stepSec);
  const window = opts.window ?? TOTP_WINDOW;
  for (let d = -window; d <= window; d++) {
    const step = now + d;
    if (step < 0 || (opts.afterStep != null && step <= opts.afterStep)) continue;
    if (hotp(secret, step, digits) === clean) return step;
  }
  return null;
}

/** Новый секрет: 20 случайных байт в base32 (32 знака). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(TOTP_SECRET_BYTES));
}

/**
 * Ссылка для QR-кода (формат Key Uri, понятный Google Authenticator и остальным): otpauth://totp/<Клуб>:<логин>?…
 * Название Клуба — издатель: в приложении видно, от какого сайта код.
 */
export function otpauthUri(secretBase32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const q = new URLSearchParams({ secret: secretBase32, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SEC) });
  return `otpauth://totp/${label}?${q.toString()}`;
}
