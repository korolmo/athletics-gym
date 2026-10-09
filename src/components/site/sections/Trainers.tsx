import { container, sectionY } from "@/components/ui/styles";
import { SectionHead } from "@/components/ui/SectionHead";
import type { SectionProps } from "@/components/site/sections/types";
import type { TrainerView } from "@/components/site/halls/types";
import { TrainersBoard } from "@/components/site/halls/TrainersBoard";

// Тренеры
export function Trainers({ t, s, trainers }: SectionProps & { trainers: TrainerView[] }) {
  return (
    <section id="trainers" className={`w-full ${sectionY}`}>
      <div className={container}>
        <SectionHead eyebrow={t.eyebrow.trainers} title={t.trainers.title} />
        <TrainersBoard t={t} trainers={trainers} whatsapp={s.contacts.whatsapp} />
      </div>
    </section>
  );
}
