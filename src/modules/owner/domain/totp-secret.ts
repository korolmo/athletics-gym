// Хранение второго фактора (этап 2, решение 5, ADR 0024): секрет TOTP — зашифрован AES-256-GCM ключом TOTP_KEY из
// окружения, коды восстановления — только хэшами (хэширует сервис, bcrypt — как пароль). Дамп базы и резервная копия
// Plesk второго фактора не дают. Только сервер (node:crypto).
import { createCipheriv, createDecipheriv, randomBytes, randomInt } from "node:crypto";

/** Версия формата: при смене алгоритма старые записи узнаются по префиксу. */
const FORMAT = "v1";

/** Ключ из TOTP_KEY: 32 байта в base64 (`openssl rand -base64 32`). Нет или не того размера — null: 2FA выключена. */
export function totpKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const key = Buffer.from(raw.trim(), "base64");
  return key.length === 32 ? key : null;
}

const b64u = (b: Buffer) => b.toString("base64url");

/** Зашифровать секрет: «v1.<iv>.<тег>.<шифротекст>» в base64url. Свой случайный iv (12 байт) на каждую запись. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [FORMAT, b64u(iv), b64u(cipher.getAuthTag()), b64u(ct)].join(".");
}

/** Расшифровать; чужой формат, другой ключ или подделка (тег GCM не сошёлся) — null. */
export function decryptSecret(stored: string, key: Buffer): string | null {
  const [format, iv, tag, ct] = stored.split(".");
  if (format !== FORMAT || !iv || !tag || ct === undefined) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ——— Коды восстановления ———

/** 10 кодов (решение 4); без похожих знаков 0/O, 1/I/L — их вводят с бумажки. */
export const RECOVERY_CODE_COUNT = 10;
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Код «XXXX-XXXX»: 8 знаков из 31 — около 40 бит, перебор закрыт лимитом попыток входа. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const one = () => Array.from({ length: 8 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join("");
  const codes = new Set<string>();
  while (codes.size < count) {
    const c = one();
    codes.add(`${c.slice(0, 4)}-${c.slice(4)}`);
  }
  return [...codes];
}

/** Как код хранится и сравнивается: без дефисов и пробелов, заглавными. Не похоже на код — null. */
export function normalizeRecoveryCode(input: string): string | null {
  const clean = input.toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{8}$/.test(clean) ? clean : null;
}
