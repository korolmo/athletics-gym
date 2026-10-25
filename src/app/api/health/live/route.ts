import { NO_STORE } from "@/lib/domain/health";
import { healthHeaders } from "@/lib/observability/cold-start";

// Liveness: процесс жив и отвечает. Зависимостей не трогает — сбой базы не повод перезапускать процесс.

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ status: "ok" }, { headers: healthHeaders(NO_STORE) });
}
