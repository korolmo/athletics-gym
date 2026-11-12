import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deliverPending, resolveSender } from "@/modules/notifications";
import { getClub } from "@/modules/club";
import { logError } from "@/lib/observability/log";

// Отправщик очереди уведомлений по расписанию (ADR 0017): GitHub Actions вызывает его каждые 5 минут
// (.github/workflows/outbox.yml) — повторы с растущей паузой и то, что не ушло сразу после ответа Клиенту.
// Доступ — только с секретом CRON_SECRET в заголовке Authorization: Bearer …; без секрета маршрута как бы нет.
export const dynamic = "force-dynamic";

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req.headers.get("authorization"))) return new NextResponse("Not found", { status: 404 });
  try {
    const report = await deliverPending(resolveSender(), (await getClub()).timeZone);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    logError("Очередь уведомлений: проход отправщика упал.", e);
    return NextResponse.json({ error: "delivery failed" }, { status: 500 });
  }
}
