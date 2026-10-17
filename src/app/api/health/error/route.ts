import { isAuthed } from "@/lib/auth";

// Проверка цепочки ошибок (docs/runbooks/observability.md): Владелец вызывает POST — сервер бросает ошибку,
// onRequestError в instrumentation.ts отправляет её в Sentry (если задан SENTRY_DSN). Посторонним — 401.

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  if (!(await isAuthed())) return Response.json({ error: "Только для Владельца." }, { status: 401 });
  throw new Error("Проверка Sentry: ошибка вызвана Владельцем через /api/health/error");
}
