// Начальные Направления — те, что до этапа 4 были записаны в словарях и в коде секции.
// На боевую базу их кладёт миграция 20261010020000_directions (совпадение проверяет тест), на пустую — seed.

import type { DirectionIcon } from "./direction";

export const DEFAULT_DIRECTIONS: { id: string; titleRu: string; titleKk: string; icon: DirectionIcon }[] = [
  { id: "dir_mass", titleRu: "Набор массы", titleKk: "Бұлшықет массасын жинау", icon: "exercise" },
  { id: "dir_weight_loss", titleRu: "Снижение веса", titleKk: "Салмақ тастау", icon: "weight" },
  { id: "dir_body_shape", titleRu: "Коррекция фигуры", titleKk: "Дене бітімін түзету", icon: "accessibility" },
  { id: "dir_powerlifting", titleRu: "Пауэрлифтинг", titleKk: "Пауэрлифтинг", icon: "barbell" },
  { id: "dir_boxing", titleRu: "Бокс", titleKk: "Бокс", icon: "boxing" },
];
