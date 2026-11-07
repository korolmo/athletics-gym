import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";

// Платформа: хэш адреса клиента. Им пользуются лимит попыток входа (Аккаунт Владельца), антиспам Отзывов
// и счётчик Обращений — сам IP нигде не хранится. Раньше жило в лимите входа (этап 6, PR 10).

/** IP клиента: на hoster.kz его ставит nginx Plesk в x-real-ip (подделку из запроса он перезаписывает), на Vercel — так же. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** В базе храним не сам IP, а его хэш с секретом. */
function hashIp(ip: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "").update(ip).digest("hex");
}

export async function currentIpHash(): Promise<string> {
  return hashIp(await clientIp());
}
