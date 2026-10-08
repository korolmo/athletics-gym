import { AirSym, EventAvailableSym, ExerciseSym, FemaleSym } from "@/components/symbols";
import { container, label, sectionY } from "@/components/ui/styles";
import { SectionHead } from "@/components/ui/SectionHead";
import type { SectionProps } from "@/components/site/sections/types";

// О зале
export function About({ t }: SectionProps) {
  const icons = [ExerciseSym, FemaleSym, AirSym, EventAvailableSym];
  return (
    <section id="about" className={`w-full bg-surface-container-low ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.about}
          title={t.about.title}
          aside={<p className="max-w-[420px] text-body-md text-text-muted">{t.meta.description}</p>}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {t.about.items.map((item, i) => {
            const Icon = icons[i] ?? ExerciseSym;
            return (
              <div
                key={item.title}
                className="group flex h-[200px] flex-col justify-between rounded-2xl bg-surface-card p-6 shadow-md transition-transform hover:-translate-y-0.5 lg:h-[280px]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary-container transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className={`${label} text-text-muted`}>
                    {String(i + 1).padStart(2, "0")} {"//"} {t.about.kickers[i]}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 text-headline-sm uppercase text-text-primary">{item.title}</h3>
                  <p className="text-body-md text-text-muted">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
