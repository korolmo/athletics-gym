import "server-only";
import { db } from "@/lib/db";
import { log } from "@/lib/observability/log";
import { getClub, restoreClubDemo, snapshotClubDemo } from "@/modules/club";
import { restoreSiteDemo, snapshotSiteDemo } from "@/modules/site";
import { restoreTrainersDemo, snapshotTrainersDemo } from "@/modules/trainers";
import { restoreTariffsDemo, snapshotTariffsDemo } from "@/modules/tariffs";
import { restoreDirectionsDemo, snapshotDirectionsDemo } from "@/modules/directions";
import { restoreReviewsDemo, snapshotReviewsDemo } from "@/modules/reviews";
import { restorePhotosDemo, snapshotPhotosDemo } from "@/modules/photos";
import { RESET_LOCK_MS, lastResetBoundary, type DemoSnapshot } from "../domain/reset";

// Суточный сброс демо-админки Лаборатории (этап П1, решения 10–11, ADR 0019). Модуль поверх остальных, как Главная:
// снимок и возврат делает каждый модуль сам, здесь — только порядок, снимок в DemoState и блокировка.
// Клиенты, Записи, очередь уведомлений и Обращения сюда не входят — это данные замеров.

const STATE_ID = "lab";

/** Части снимка в порядке возврата: Тренеры раньше Тарифов — удалённый Тренер уносит свои Тарифы. */
const PARTS: [string, () => Promise<unknown>, (data: never) => Promise<void>][] = [
  ["club", snapshotClubDemo, restoreClubDemo],
  ["site", snapshotSiteDemo, restoreSiteDemo],
  ["trainers", snapshotTrainersDemo, restoreTrainersDemo],
  ["tariffs", snapshotTariffsDemo, restoreTariffsDemo],
  ["directions", snapshotDirectionsDemo, restoreDirectionsDemo],
  ["reviews", snapshotReviewsDemo, restoreReviewsDemo],
  ["gallery", snapshotPhotosDemo, restorePhotosDemo],
];

async function collect(): Promise<DemoSnapshot> {
  const out: DemoSnapshot = {};
  for (const [key, take] of PARTS) out[key] = await take();
  return out;
}

/** Снять текущее состояние как исходное (кнопка Владельца и первый сброс без снимка). */
export async function takeDemoSnapshot(ensureRealOwner: () => Promise<void>, now: Date = new Date()): Promise<void> {
  await ensureRealOwner();
  const snapshot = JSON.stringify(await collect());
  await db.demoState.upsert({ where: { id: STATE_ID }, update: { snapshot, snapshotAt: now }, create: { id: STATE_ID, snapshot, snapshotAt: now } });
}

export type ResetResult = { ran: false } | { ran: true; snapshotTaken: boolean; ms: number };

/**
 * Сброс, если пора (после 04:00 по времени Клуба и не было с тех пор). Два запроса одновременно сброс не повторят:
 * строку «занимает» условный update. Снимка нет — снимаем текущее состояние как исходное и ничего не меняем.
 */
export async function runDailyDemoReset(now: Date = new Date()): Promise<ResetResult> {
  await db.demoState.upsert({ where: { id: STATE_ID }, update: {}, create: { id: STATE_ID } });
  // Граница — в поясе Клуба; модуль Демо поверх всех и читает Клуб сам
  const boundary = lastResetBoundary(now, (await getClub()).timeZone);
  const { count } = await db.demoState.updateMany({
    where: {
      id: STATE_ID,
      OR: [{ lastResetAt: null }, { lastResetAt: { lt: boundary } }],
      AND: [{ OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }],
    },
    data: { lockedUntil: new Date(now.getTime() + RESET_LOCK_MS) },
  });
  if (count === 0) return { ran: false };

  const started = Date.now();
  const state = await db.demoState.findUniqueOrThrow({ where: { id: STATE_ID }, select: { snapshot: true } });
  if (!state.snapshot) {
    await db.demoState.update({ where: { id: STATE_ID }, data: { snapshot: JSON.stringify(await collect()), snapshotAt: now } });
  } else {
    // Сбой посередине — блокировка остаётся до своего срока: следующая попытка будет через несколько минут, не по кругу
    const snapshot = JSON.parse(state.snapshot) as DemoSnapshot;
    for (const [key, , restore] of PARTS) if (key in snapshot) await restore(snapshot[key] as never);
  }
  const ms = Date.now() - started;
  await db.demoState.update({ where: { id: STATE_ID }, data: { lastResetAt: now, lastResetMs: ms, lockedUntil: null } });
  log("info", `Демо Лаборатории: ${state.snapshot ? "сброс к снимку" : "снят исходный снимок"} за ${ms} мс`);
  return { ran: true, snapshotTaken: !state.snapshot, ms };
}

export type DemoStatus = { snapshotAt: Date | null; lastResetAt: Date | null; lastResetMs: number | null };

export async function getDemoStatus(ensureOwner: () => Promise<void>): Promise<DemoStatus> {
  await ensureOwner();
  const s = await db.demoState.findUnique({ where: { id: STATE_ID }, select: { snapshotAt: true, lastResetAt: true, lastResetMs: true } });
  return { snapshotAt: s?.snapshotAt ?? null, lastResetAt: s?.lastResetAt ?? null, lastResetMs: s?.lastResetMs ?? null };
}
