import { isAuthed } from "@/lib/auth";
import { currentIpHash } from "@/lib/auth/login-limit";
import { CONTACT_RATE, acceptContact, createRateLimiter } from "@/lib/domain/contact";
import { recordContact } from "@/lib/services/contacts";

// Счётчик Обращений: сайт сообщает сюда о нажатии на кнопку связи (navigator.sendBeacon).
// Ответ всегда пустой и никогда не ошибка: переход в WhatsApp от этого запроса не зависит.

export const dynamic = "force-dynamic";

/** Лимит живёт в памяти процесса: хэш адреса в базу не пишется. */
const limiter = createRateLimiter(CONTACT_RATE);
const MAX_BODY = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const raw = await request.text();
    const body: unknown = raw.length <= MAX_BODY ? JSON.parse(raw) : null;
    await acceptContact(body, {
      ipHash: await currentIpHash(),
      now: Date.now(),
      limiter,
      isOwner: isAuthed,
      save: recordContact,
    });
  } catch (e) {
    // Невалидный JSON или недоступная база — нажатие просто не посчитано
    if (!(e instanceof SyntaxError)) console.error("Счётчик Обращений: нажатие не записано.", e);
  }
  return new Response(null, { status: 204 });
}
