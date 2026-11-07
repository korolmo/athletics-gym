// Модуль Окна Тренера (этап 1, ADR 0017): часы работы, исключения, длительность тренировки и расчёт свободных Окон.
// Тренеров не импортирует — связь с ними только внешним ключом в базе. Записи не знает: занятое время передают ему.
// Снаружи — этот файл (сервер) и client.ts (браузер).
import "server-only";

export * from "./client";
export { parseTimeOff, parseWorkWeek } from "./validation/schedule";
export {
  addTimeOff,
  deleteTimeOff,
  getScheduleForAdmin,
  isWindowFree,
  listWindows,
  saveWorkWeek,
  sessionMinutesOf,
  type ScheduleForAdmin,
} from "./service/schedule";
