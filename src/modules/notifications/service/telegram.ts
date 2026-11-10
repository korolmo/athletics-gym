// Канал доставки уведомлений — Telegram-бот Владельца (ADR 0017). Адаптер: отправщик о Telegram не знает,
// он получает `Sender`. Без токена и чата канала нет — события ждут в очереди, админка это показывает.

export type SendResult = { ok: true } | { ok: false; error: string };

export interface Sender {
  readonly name: string;
  send(text: string): Promise<SendResult>;
}

export function telegramSender(token: string, chatId: string, fetchImpl: typeof fetch = fetch): Sender {
  return {
    name: "telegram",
    async send(text) {
      try {
        const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) return { ok: true };
        // Текст ошибки Telegram — без адреса запроса: в нём токен бота
        const body = (await res.text().catch(() => "")).slice(0, 300);
        return { ok: false, error: `Telegram ${res.status}: ${body}` };
      } catch (e) {
        return { ok: false, error: `Telegram недоступен: ${e instanceof Error ? e.name : "ошибка сети"}` };
      }
    },
  };
}

/** Канал по окружению: TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. Нет хотя бы одного — канала нет (null). */
export function resolveSender(env: Record<string, string | undefined> = process.env): Sender | null {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = env.TELEGRAM_CHAT_ID?.trim();
  return token && chat ? telegramSender(token, chat) : null;
}
