import { NO_STORE, publicReadyBody } from "@/lib/domain/health";
import { getReadiness } from "@/lib/services/health";
import { healthHeaders } from "@/lib/observability/cold-start";

// Readiness: база и хранилище Фото ответили за READY_TIMEOUT_MS (~1 с). Для мониторинга и прод-двойника.
// Наружу только ok / fail — подробности видит Владелец в /api/health.

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const body = publicReadyBody(await getReadiness());
  return Response.json(body, { status: body.status === "ok" ? 200 : 503, headers: healthHeaders(NO_STORE) });
}
