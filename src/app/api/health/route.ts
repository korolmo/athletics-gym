import { isAuthed } from "@/lib/auth";
import { getHealth } from "@/lib/services/health";

// Состояние сервера: версии Node, ОС и OpenSSL, память, место для Фото, связь с базой.
// Только с сессией Владельца: откройте /api/health в браузере, где вы вошли в админку.

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!(await isAuthed())) {
    return Response.json({ error: "Только для Владельца: войдите в админку и откройте адрес снова." }, { status: 401 });
  }
  const health = await getHealth();
  return Response.json(health, { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
