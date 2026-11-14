import { NO_STORE, publicReadyBody } from "@/lib/domain/health";
import { getReadiness } from "@/lib/services/health";
import { photoStorageHealth } from "@/modules/photos";
import { healthHeaders } from "@/lib/observability/cold-start";
import { kickOutbox } from "@/app/outbox-kick";
import { kickDemoReset } from "@/app/demo-reset-kick";
import { kickBurnCheck } from "@/app/burn-kick";

// Readiness: база и хранилище Фото ответили за READY_TIMEOUT_MS (~1 с). Для мониторинга и прод-двойника.
// Наружу только ok / fail — подробности видит Владелец в /api/health.

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const body = publicReadyBody(await getReadiness(photoStorageHealth));
  // UptimeRobot зовёт готовность каждые 5 минут — попутно запускаем повторы очереди уведомлений (после ответа)
  kickOutbox();
  // …и суточный сброс демо-админки, где включён гостевой вход (этап П1)
  kickDemoReset();
  // …и проверку выгорания бюджета ошибок с тревогой в чат «Дежурство» (этап 5, только production Лаборатории)
  kickBurnCheck();
  return Response.json(body, { status: body.status === "ok" ? 200 : 503, headers: healthHeaders(NO_STORE) });
}
