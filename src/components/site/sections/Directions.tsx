import Image from "next/image";
import { ArrowForwardSym } from "@/components/symbols";
import { DIRECTION_ICON } from "@/components/site/direction-icons";
import type { DirectionView } from "@/lib/domain/direction";
import { whatsappUrl } from "@/lib/site";
import { container, label, sectionY } from "@/components/ui/styles";
import { SectionHead } from "@/components/ui/SectionHead";
import type { SectionProps } from "@/components/site/sections/types";

// Направления: с чем помогут Тренеры (групповых занятий в зале нет). Список ведёт Владелец; здесь — только не скрытые.
export function Directions({ t, s, directions }: SectionProps & { directions: DirectionView[] }) {
  // Строка описаний есть в сетке, только если описание есть хотя бы у одного Направления:
  // пустая строка subgrid всё равно заняла бы высоту зазора и раздвинула карточки
  const withText = directions.some((d) => d.description);
  // Карточки ведут к блоку Тренеров; если Владелец его скрыл — в WhatsApp зала
  const toTrainers = s.show.trainers
    ? { href: "#trainers" }
    : { href: whatsappUrl(s.contacts.whatsapp, t.wa.personal), target: "_blank", rel: "noopener noreferrer" };
  return (
    <section id="directions" className={`w-full ${sectionY}`}>
      <div className={container}>
        <SectionHead
          eyebrow={t.eyebrow.directions}
          title={t.directions.title}
          aside={
            s.show.trainers && (
              <a
                href="#trainers"
                className={`${label} inline-flex items-center gap-1.5 text-text-muted transition-colors hover:text-primary-container`}
              >
                {t.directions.toTrainers}
                <ArrowForwardSym className="h-4 w-4 text-primary-container" />
              </a>
            )
          }
        />
        {/* Карточка — строки общей сетки (subgrid): иконка с номером, заголовок и, если есть, описание;
            заголовки в ряду начинаются на одной линии, в одну они строку или в две */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {directions.map((d, i) => {
            const Icon = DIRECTION_ICON[d.icon];
            return (
              <a
                key={d.id}
                {...toTrainers}
                data-card
                className={`group ${withText ? "row-span-3" : "row-span-2"} grid grid-rows-subgrid gap-y-0 rounded-2xl bg-surface-card p-5 shadow-md transition-transform hover:-translate-y-0.5 lg:p-6`}
              >
                <div data-slot="top" className="flex items-center justify-between">
                  {d.photoUrl ? (
                    // Своё Фото Владельца стоит на месте иконки и того же размера — карточки в ряду остаются одинаковыми
                    <span className="relative block h-12 w-12 overflow-hidden rounded-xl bg-surface-container">
                      <Image src={d.photoUrl} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary-container transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                  )}
                  <span className={`${label} text-text-muted`}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3
                  data-slot="title"
                  className="mt-8 text-[15px] font-bold uppercase leading-5 text-text-primary [overflow-wrap:anywhere] sm:text-headline-sm lg:mt-14"
                >
                  {d.title}
                </h3>
                {withText && (
                  <p data-slot="text" className={d.description ? "mt-2 text-body-sm text-text-muted [overflow-wrap:anywhere]" : ""}>
                    {d.description}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
