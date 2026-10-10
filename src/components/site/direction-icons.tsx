import type { DirectionIcon } from "@/lib/domain/direction";
import {
  AccessibilityNewSym,
  DirectionsRunSym,
  EcgHeartSym,
  ExerciseSym,
  FitnessCenterSym,
  LocalFireDepartmentSym,
  MonitorWeightSym,
  NutritionSym,
  PhysicalTherapySym,
  SelfImprovementSym,
  SportsGymnasticsSym,
  SportsMartialArtsSym,
  SportsMmaSym,
  TimerSym,
} from "@/components/symbols";

/** Набор иконок Направлений: ключ хранится в базе, рисунок — здесь; подписи — в lib/presentation/direction-labels.ts. */
export const DIRECTION_ICON: Record<DirectionIcon, (p: { className?: string }) => React.ReactNode> = {
  exercise: ExerciseSym,
  weight: MonitorWeightSym,
  accessibility: AccessibilityNewSym,
  barbell: FitnessCenterSym,
  boxing: SportsMmaSym,
  run: DirectionsRunSym,
  stretch: SportsGymnasticsSym,
  yoga: SelfImprovementSym,
  rehab: PhysicalTherapySym,
  nutrition: NutritionSym,
  martial: SportsMartialArtsSym,
  cardio: EcgHeartSym,
  timer: TimerSym,
  fire: LocalFireDepartmentSym,
};
