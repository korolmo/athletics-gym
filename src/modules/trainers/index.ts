// Модуль Тренеры (этап 6, ADR 0015): Тренер, его персональные Тарифы и место для Фото «Плакат Тренера».
// Снаружи — только этот файл (сервер) и client.ts (браузер). Зависит от Тарифов и Фото, не наоборот.
import "server-only";

export * from "./client";
export { parseTrainerForm, trainerSchema, type TrainerInput } from "./validation/trainer";
export {
  deleteTrainer,
  getTrainer,
  getTrainerWithTariffs,
  listTrainers,
  saveTrainer,
  toggleTrainerVisibility,
  trainerHall,
} from "./service/trainers";
export { trainerPosterSlot } from "./service/poster";
export { getBookableTrainer, getTrainerNames, listVisibleTrainersWithTariffs } from "./service/public";
