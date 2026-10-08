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
        {/* Карточка занимает три строки общей сетки (subgrid): иконка с номером, заголовок, описание —
            поэтому в ряду заголовки и описания начинаются на одной линии при любой длине текста */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {t.about.items.map((item, i) => {
            const Icon = icons[i] ?? ExerciseSym;
            return (
              <div
                key={item.title}
                data-card
                className="group row-span-3 grid grid-rows-subgrid gap-y-0 rounded-2xl bg-surface-card p-6 shadow-md transition-transform hover:-translate-y-0.5"
              >
                <div data-slot="top" className="flex items-center justify-between gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary-container transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className={`${label} text-right text-text-muted`}>
                    {String(i + 1).padStart(2, "0")} {"//"} {t.about.kickers[i]}
                  </span>
                </div>
                <h3 data-slot="title" className="mt-12 text-headline-sm uppercase text-text-primary lg:mt-24">
                  {item.title}
                </h3>
                <p data-slot="text" className="mt-2 text-body-md text-text-muted">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
