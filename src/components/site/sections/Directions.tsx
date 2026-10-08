import {
  AccessibilityNewSym,
  ArrowForwardSym,
  ExerciseSym,
  FitnessCenterSym,
  MonitorWeightSym,
  SportsMmaSym,
} from "@/components/symbols";
import { container, label, sectionY } from "@/components/ui/styles";
import { SectionHead } from "@/components/ui/SectionHead";
import type { SectionProps } from "@/components/site/sections/types";

// Направления: с чем помогут Тренеры (групповых занятий в зале нет)
export function Directions({ t }: SectionProps) {
  const icons = [ExerciseSym, MonitorWeightSym, AccessibilityNewSym, FitnessCenterSym, SportsMmaSym];
  return (
    <section id="directions" className={`w-full ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.directions}
          title={t.directions.title}
          aside={
            <a
              href="#trainers"
              className={`${label} inline-flex items-center gap-1.5 text-text-muted transition-colors hover:text-primary-container`}
            >
              {t.directions.toTrainers}
              <ArrowForwardSym className="h-4 w-4 text-primary-container" />
            </a>
          }
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {t.directions.items.map((title, i) => {
            const Icon = icons[i] ?? ExerciseSym;
            return (
              <a
                key={title}
                href="#trainers"
                className="group flex h-[150px] flex-col justify-between rounded-2xl bg-surface-card p-5 shadow-md transition-transform hover:-translate-y-0.5 lg:h-[180px] lg:p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary-container transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className={`${label} text-text-muted`}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="text-[15px] font-bold uppercase leading-5 text-text-primary sm:text-headline-sm">{title}</h3>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
