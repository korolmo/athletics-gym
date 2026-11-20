import "server-only";
import { dbFor } from "@/lib/tenant-db";
import { log } from "@/lib/observability/log";
import { getClub, restoreClubDemo, snapshotClubDemo } from "@/modules/club";
import { CLUB_ID } from "@/modules/club/client";
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

/** Строка состояния одна на Клуб (этап П2): ищем по Клубу; ключ — «lab» у Клуба по умолчанию, как до П2. */
const stateRowId = (clubId: string) => (clubId === CLUB_ID ? "lab" : `lab-${clubId}`);

/** Части снимка в порядке возврата: Тренеры раньше Тарифов — удалённый Тренер уносит свои Тарифы. */
const PARTS: [string, (clubId: string) => Promise<unknown>, (clubId: string, data: never) => Promise<void>][] = [
  ["club", snapshotClubDemo, restoreClubDemo],
  ["site", snapshotSiteDemo, restoreSiteDemo],
  ["trainers", snapshotTrainersDemo, restoreTrainersDemo],
  ["tariffs", snapshotTariffsDemo, restoreTariffsDemo],
  ["directions", snapshotDirectionsDemo, restoreDirectionsDemo],
  ["reviews", snapshotReviewsDemo, restoreReviewsDemo],
  ["gallery", snapshotPhotosDemo, restorePhotosDemo],
];

async function collect(clubId: string): Promise<DemoSnapshot> {
  const out: DemoSnapshot = {};
  for (const [key, take] of PARTS) out[key] = await take(clubId);
  return out;
}

/** Снять текущее состояние как исходное (кнопка Владельца и первый сброс без снимка). */
export async function takeDemoSnapshot(clubId: string, ensureRealOwner: () => Promise<void>, now: Date = new Date()): Promise<void> {
  await ensureRealOwner();
  const snapshot = JSON.stringify(await collect(clubId));
  await dbFor(clubId).demoState.upsert({ where: { clubId }, update: { snapshot, snapshotAt: now }, create: { id: stateRowId(clubId), snapshot, snapshotAt: now } });
}

export type ResetResult = { ran: false } | { ran: true; snapshotTaken: boolean; ms: number };

/**
 * Сброс, если пора (после 04:00 по времени Клуба и не было с тех пор). Два запроса одновременно сброс не повторят:
 * строку «занимает» условный update. Снимка нет — снимаем текущее состояние как исходное и ничего не меняем.
 */
export async function runDailyDemoReset(clubId: string, now: Date = new Date()): Promise<ResetResult> {
  await dbFor(clubId).demoState.upsert({ where: { clubId }, update: {}, create: { id: stateRowId(clubId) } });
  // Граница — в поясе Клуба; модуль Демо поверх всех и читает Клуб сам
  const boundary = lastResetBoundary(now, (await getClub(clubId)).timeZone);
  const { count } = await dbFor(clubId).demoState.updateMany({
    where: {
      OR: [{ lastResetAt: null }, { lastResetAt: { lt: boundary } }],
      AND: [{ OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }],
    },
    data: { lockedUntil: new Date(now.getTime() + RESET_LOCK_MS) },
  });
  if (count === 0) return { ran: false };

  const started = Date.now();
  const state = await dbFor(clubId).demoState.findUniqueOrThrow({ where: { clubId }, select: { snapshot: true } });
  if (!state.snapshot) {
    await dbFor(clubId).demoState.update({ where: { clubId }, data: { snapshot: JSON.stringify(await collect(clubId)), snapshotAt: now } });
  } else {
    // Сбой посередине — блокировка остаётся до своего срока: следующая попытка будет через несколько минут, не по кругу
    const snapshot = JSON.parse(state.snapshot) as DemoSnapshot;
    for (const [key, , restore] of PARTS) if (key in snapshot) await restore(clubId, snapshot[key] as never);
  }
  const ms = Date.now() - started;
  await dbFor(clubId).demoState.update({ where: { clubId }, data: { lastResetAt: now, lastResetMs: ms, lockedUntil: null } });
  log("info", `Демо Лаборатории: ${state.snapshot ? "сброс к снимку" : "снят исходный снимок"} за ${ms} мс`);
  return { ran: true, snapshotTaken: !state.snapshot, ms };
}

export type DemoStatus = { snapshotAt: Date | null; lastResetAt: Date | null; lastResetMs: number | null };

export async function getDemoStatus(clubId: string, ensureOwner: () => Promise<void>): Promise<DemoStatus> {
  await ensureOwner();
  const s = await dbFor(clubId).demoState.findUnique({ where: { clubId }, select: { snapshotAt: true, lastResetAt: true, lastResetMs: true } });
  return { snapshotAt: s?.snapshotAt ?? null, lastResetAt: s?.lastResetAt ?? null, lastResetMs: s?.lastResetMs ?? null };
}
