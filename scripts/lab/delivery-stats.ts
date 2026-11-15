// Сводка доставки уведомлений о Записях в основной Лаборатории (этап 1, решение 20): доля событий outbox,
// доставленных за 5 минут, и недоставленные — за окно. Только агрегаты: имён Клиентов и телефонов скрипт не печатает.
//   LAB_DATABASE_URL=… npx tsx scripts/lab/delivery-stats.ts [с ISO-датой] [по ISO-дату]
// Запускает .github/workflows/lab-stats.yml (вручную и на своём PR); вывод — и в отчёт шага GitHub.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { ON_TIME_MS, summarizeDelivery } from "../../src/modules/notifications/domain/outbox";
import { hideUrl, withConnectRetry } from "./connect-retry.mjs";
import { labProductionUrl } from "./preview-db-core.mjs";

const base = process.env.LAB_DATABASE_URL;
if (!base) {
  console.error("Нет LAB_DATABASE_URL (секрет репозитория).");
  process.exit(1);
}
const from = new Date(process.argv[2] ?? "2026-11-10T00:00:00Z");
const to = new Date(process.argv[3] ?? new Date().toISOString());
const BOOKING_TYPES = ["booking.created", "booking.cancelled"];

async function main() {
  const db = new PrismaClient({ datasourceUrl: labProductionUrl(base!) });
  try {
    await withConnectRetry(() => db.$queryRawUnsafe("SELECT 1"));
    const rows = await db.outboxEvent.findMany({
      where: { type: { in: BOOKING_TYPES }, createdAt: { gte: from, lte: to } },
      select: { type: true, status: true, attempts: true, createdAt: true, sentAt: true, lastError: true },
      orderBy: { createdAt: "asc" },
    });
    const s = summarizeDelivery(rows, to);
    const lags = rows.filter((r) => r.sentAt).map((r) => r.sentAt!.getTime() - r.createdAt.getTime()).sort((a, b) => a - b);
    const q = (p: number) => (lags.length ? Math.round(lags[Math.min(lags.length - 1, Math.ceil((lags.length * p) / 100) - 1)] / 1000) : null);
    const retried = rows.filter((r) => r.status === "SENT" && r.attempts > 1).length;
    const byType = Object.fromEntries(BOOKING_TYPES.map((t) => [t, rows.filter((r) => r.type === t).length]));
    const problems = rows.filter((r) => r.status === "DEAD" || r.status === "RESOLVED" || (r.status === "PENDING" && r.attempts > 0));
    const lines = [
      `### Доставка уведомлений о Записях, Лаборатория (${from.toISOString().slice(0, 16)} – ${to.toISOString().slice(0, 16)} UTC)`,
      "",
      "| Что | Значение |",
      "|---|---|",
      `| Событий | ${s.total} (новые Записи ${byType["booking.created"]}, отмены ${byType["booking.cancelled"]}) |`,
      `| Отправлено | ${s.sent}, из них со 2-й попытки и позже — ${retried} |`,
      `| Вовремя (≤ ${ON_TIME_MS / 60_000} мин) | ${s.onTime} — **${s.onTimeShare === null ? "—" : (s.onTimeShare * 100).toFixed(1).replace(".", ",") + " %"}** |`,
      `| Задержка отправки p50 / p95 / максимум | ${q(50) ?? "—"} / ${q(95) ?? "—"} / ${s.slowestMs === null ? "—" : Math.round(s.slowestMs / 1000)} с |`,
      `| Ждут / недоставлены / помечены решёнными | ${s.pending} / **${s.dead}** / ${s.resolved} |`,
    ];
    if (problems.length) {
      lines.push("", "Проблемные события (без данных Клиента):", "", "| Создано | Тип | Статус | Попыток | Ошибка |", "|---|---|---|---|---|");
      for (const r of problems) lines.push(`| ${r.createdAt.toISOString().slice(0, 16)} | ${r.type} | ${r.status} | ${r.attempts} | ${(r.lastError ?? "").replace(/\|/g, "/").slice(0, 120)} |`);
    }
    const text = lines.join("\n");
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(hideUrl(e instanceof Error ? e.message : String(e)));
  process.exitCode = 1;
});
