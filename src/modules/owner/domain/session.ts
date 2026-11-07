// Подписанный токен сессии. Только Web Crypto, без Node-модулей и next/*:
// файл работает и в middleware (edge), и в серверных действиях, и в тестах.

export const SESSION_COOKIE = "ag_admin";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/** Что лежит в действующем токене. */
export type Session = {
  /**
   * Версия сессии из аккаунта Владельца на момент входа. Смена пароля и «Выйти на всех устройствах»
   * увеличивают версию в базе — и все выданные раньше куки перестают подходить.
   */
  version: number;
  expiresAt: number;
};

const encoder = new TextEncoder();

function assertSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET не задан или короче 32 символов (см. .env)");
  return secret;
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) return null;
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Токен вида `admin.<срок в мс>.v<версия>.<подпись>`: версия входит в подпись. */
export async function signSession(secret: string | undefined, session: Session): Promise<string> {
  const payload = `admin.${session.expiresAt}.v${session.version}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(assertSecret(secret), "sign"), encoder.encode(payload));
  return `${payload}.${toHex(signature)}`;
}

/**
 * Проверяет подпись (за постоянное время) и срок действия.
 * Возвращает содержимое токена или null. Версию с текущей сравнивает вызывающий:
 * middleware её не знает (она в базе), а requireOwner() — знает.
 */
export async function readSession(
  token: string | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<Session | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const signature = fromHex(token.slice(dot + 1));
  if (!signature) return null;

  const match = /^admin\.(\d+)\.v(\d+)$/.exec(payload);
  if (!match) return null;

  const ok = await crypto.subtle.verify("HMAC", await hmacKey(assertSecret(secret), "verify"), signature, encoder.encode(payload));
  if (!ok) return null;

  const expiresAt = Number(match[1]);
  const version = Number(match[2]);
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(version) || expiresAt <= now) return null;
  return { version, expiresAt };
}
