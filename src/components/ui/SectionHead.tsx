import { eyebrow, h2 } from "@/components/ui/styles";

/** Заголовок секции: надзаголовок, название, необязательные бейдж и блок справа. */
export function SectionHead({
  eyebrow: over,
  title,
  badge,
  aside,
}: {
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div className={eyebrow}>{over}</div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={h2}>{title}</h2>
          {badge}
        </div>
      </div>
      {aside}
    </div>
  );
}
