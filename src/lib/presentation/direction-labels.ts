// Как иконки Направлений называются в админке — Владелец выбирает иконку по рисунку и подписи.
import type { DirectionIcon } from "@/lib/domain/direction";

export const DIRECTION_ICON_LABEL_RU: Record<DirectionIcon, string> = {
  exercise: "Набор массы",
  weight: "Похудение",
  accessibility: "Фигура",
  barbell: "Штанга",
  boxing: "Бокс",
  run: "Бег",
  stretch: "Растяжка",
  yoga: "Йога",
  rehab: "Реабилитация",
  nutrition: "Питание",
  martial: "Единоборства",
  cardio: "Кардио",
  timer: "Интервалы",
  fire: "Жиросжигание",
};
