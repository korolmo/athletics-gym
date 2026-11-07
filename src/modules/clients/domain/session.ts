// Подписанный токен сессии Клиента (ADR 0016). Только Web Crypto: файл работает и в middleware, и на сервере, и в тестах.
// Сессия Клиента отдельна от сессии Владельца: своё имя cookie, свой вид токена и свой ключ подписи,
// выведенный из AUTH_SECRET с меткой, — токен Клиента не подходит к админке, даже если подменить cookie.

export const CLIENT_SESSION_COOKIE = "ag_client";
/** 30 дней. Срок назван в Политике конфиденциальности. */
export const CLIENT_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type ClientSession = {
  clientId: string;
  /** Версия сессии из аккаунта Клиента: «Выйти на всех устройствах» её увеличивает */
  version: number;
  expiresAt: number;
};

const encoder = new TextEncoder();
const KEY_LABEL = "client-session-v1";

function assertSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET не задан или короче 32 символов (см. .env)");
  return secret;
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  // Ключ сессии Клиента — HMAC(AUTH_SECRET, метка): не тот же ключ, что у сессии Владельца
  const base = await crypto.subtle.importKey("raw", encoder.encode(assertSecret(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const derived = await crypto.subtle.sign("HMAC", base, encoder.encode(KEY_LABEL));
  return crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, [usage]);
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

/** Токен вида `client.<id>.<срок в мс>.v<версия>.<подпись>`. */
export async function signClientSession(secret: string | undefined, session: ClientSession): Promise<string> {
  if (!/^[a-z0-9]+$/i.test(session.clientId)) throw new Error("Неверный id Клиента для сессии");
  const payload = `client.${session.clientId}.${session.expiresAt}.v${session.version}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret ?? "", "sign"), encoder.encode(payload));
  return `${payload}.${toHex(signature)}`;
}

/** Проверяет подпись и срок. Версию с текущей сравнивает вызывающий: middleware её не знает. */
export async function readClientSession(
  token: string | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<ClientSession | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const signature = fromHex(token.slice(dot + 1));
  if (!signature) return null;

  const match = /^client\.([a-z0-9]+)\.(\d+)\.v(\d+)$/i.exec(payload);
  if (!match) return null;

  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret ?? "", "verify"), signature, encoder.encode(payload));
  if (!ok) return null;

  const expiresAt = Number(match[2]);
  const version = Number(match[3]);
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(version) || expiresAt <= now) return null;
  return { clientId: match[1], version, expiresAt };
}
