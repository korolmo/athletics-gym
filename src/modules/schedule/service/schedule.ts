import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/modules/owner";
import { zonedParts } from "@/lib/time";
import type { ServiceResult } from "@/lib/services/result";
import {
  DEFAULT_SESSION_MINUTES,
  computeWindows,
  isFreeWindow,
  type Busy,
  type TimeOff,
  type TrainerSchedule,
  type Window,
  type WorkInterval,
} from "../domain/schedule";

// Часы работы Тренера, исключения и Окна (этап 1, ADR 0017). Тренера модуль не импортирует: связь — внешний ключ
// с каскадным удалением; удалили Тренера — его часы и исключения удалила база.

function isForeignKey(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2003";
}

const NO_TRAINER = "Тренер не найден — возможно, его уже удалили.";

/** Шаблон Тренера; без сохранённых часов — пустой, длительность по умолчанию. Исключения — только не закончившиеся. */
async function loadSchedule(trainerId: string, today: string): Promise<TrainerSchedule> {
  const [settings, workHours, timeOff] = await Promise.all([
    db.trainerSchedule.findUnique({ where: { trainerId }, select: { sessionMinutes: true } }),
    db.trainerWorkHours.findMany({ where: { trainerId }, select: { weekday: true, startMin: true, endMin: true } }),
    db.trainerTimeOff.findMany({ where: { trainerId, toDay: { gte: today } }, select: { fromDay: true, toDay: true } }),
  ]);
  return { sessionMinutes: settings?.sessionMinutes ?? DEFAULT_SESSION_MINUTES, workHours, timeOff };
}

// ——— Кабинет и Записи: без сессии Владельца ———

/**
 * Свободные Окна Тренера. Занятое время (`busy`) передаёт слой приложения из модуля Записи —
 * Окна не знают о Записях, Записи знают об Окнах.
 */
export async function listWindows(trainerId: string, busy: Busy[], now: Date = new Date()): Promise<Window[]> {
  return computeWindows(await loadSchedule(trainerId, zonedParts(now).day), busy, now);
}

/** Свободно ли Окно с началом `start` — проверка модуля Записи перед созданием Записи. */
export async function isWindowFree(trainerId: string, start: Date, busy: Busy[], now: Date = new Date()): Promise<boolean> {
  return isFreeWindow(await loadSchedule(trainerId, zonedParts(now).day), busy, start, now);
}

/** Длительность тренировки Тренера — модулю Записи, чтобы задать конец Записи. */
export async function sessionMinutesOf(trainerId: string): Promise<number> {
  return (await db.trainerSchedule.findUnique({ where: { trainerId }, select: { sessionMinutes: true } }))?.sessionMinutes ?? DEFAULT_SESSION_MINUTES;
}

// ——— Админка ———

export type ScheduleForAdmin = {
  sessionMinutes: number;
  workHours: WorkInterval[];
  timeOff: (TimeOff & { id: string; note: string | null })[];
};

/** Часы работы и не закончившиеся исключения Тренера для раздела «Тренеры». */
export async function getScheduleForAdmin(trainerId: string, now: Date = new Date()): Promise<ScheduleForAdmin> {
  await requireOwner();
  const today = zonedParts(now).day;
  const [settings, workHours, timeOff] = await Promise.all([
    db.trainerSchedule.findUnique({ where: { trainerId }, select: { sessionMinutes: true } }),
    db.trainerWorkHours.findMany({
      where: { trainerId },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
      select: { weekday: true, startMin: true, endMin: true },
    }),
    db.trainerTimeOff.findMany({
      where: { trainerId, toDay: { gte: today } },
      orderBy: { fromDay: "asc" },
      select: { id: true, fromDay: true, toDay: true, note: true },
    }),
  ]);
  return { sessionMinutes: settings?.sessionMinutes ?? DEFAULT_SESSION_MINUTES, workHours, timeOff };
}

/** Заменяет недельный шаблон Тренера целиком (данные уже проверены parseWorkWeek). Уже сделанные Записи не трогает. */
export async function saveWorkWeek(trainerId: string, input: { sessionMinutes: number; intervals: WorkInterval[] }): Promise<ServiceResult<object>> {
  await requireOwner();
  try {
    await db.$transaction([
      db.trainerSchedule.upsert({
        where: { trainerId },
        create: { trainerId, sessionMinutes: input.sessionMinutes },
        update: { sessionMinutes: input.sessionMinutes },
      }),
      db.trainerWorkHours.deleteMany({ where: { trainerId } }),
      db.trainerWorkHours.createMany({ data: input.intervals.map((i) => ({ trainerId, ...i })) }),
    ]);
    return { ok: true };
  } catch (e) {
    if (isForeignKey(e)) return { ok: false, error: NO_TRAINER };
    throw e;
  }
}

export async function addTimeOff(trainerId: string, input: TimeOff & { note: string | null }): Promise<ServiceResult<object>> {
  await requireOwner();
  try {
    await db.trainerTimeOff.create({ data: { trainerId, ...input } });
    return { ok: true };
  } catch (e) {
    if (isForeignKey(e)) return { ok: false, error: NO_TRAINER };
    throw e;
  }
}

export async function deleteTimeOff(id: string): Promise<void> {
  await requireOwner();
  await db.trainerTimeOff.deleteMany({ where: { id } });
}
