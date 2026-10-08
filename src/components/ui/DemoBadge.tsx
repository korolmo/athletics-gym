/** Пометка Демо-данных. */
export function DemoBadge({ label: text }: { label: string }) {
  return (
    <span className="rounded-sm bg-primary-container/10 px-2 py-0.5 text-[11px] uppercase text-primary-container">
      {text}
    </span>
  );
}
