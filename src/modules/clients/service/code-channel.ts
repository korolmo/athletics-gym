import { isDemoPhone } from "../domain/phone";

// Канал доставки кода (ADR 0016) — адаптер: как код попадает к Клиенту. Сейчас есть только демо-канал
// Лаборатории; настоящий (SMS или WhatsApp) появится вместе с договором и решением Владельца о проде.

export type Delivery = { delivered: true; shownCode?: string } | { delivered: false };

export interface CodeChannel {
  readonly name: string;
  /** Принимает ли канал этот номер. */
  accepts(phone: string): boolean;
  deliver(phone: string, code: string): Promise<Delivery>;
}

/**
 * Демо-канал: код никуда не отправляется, а показывается на экране. Только тестовые номера (DEMO_PHONES) —
 * настоящий номер в Лаборатории войти не может.
 */
export const demoChannel: CodeChannel = {
  name: "demo",
  accepts: isDemoPhone,
  async deliver(phone, code) {
    if (!isDemoPhone(phone)) return { delivered: false };
    return { delivered: true, shownCode: code };
  },
};

/**
 * Канал по окружению: CLIENT_CODE_CHANNEL (по умолчанию demo). На боевом сайте (APP_ENV=production) демо-канала нет —
 * без настоящего канала вход в кабинет закрыт, код на экране там не покажется никогда.
 */
export function resolveCodeChannel(env: Record<string, string | undefined> = process.env): CodeChannel | null {
  const name = env.CLIENT_CODE_CHANNEL?.trim() || "demo";
  if (name === "demo") return env.APP_ENV?.trim() === "production" ? null : demoChannel;
  return null;
}
