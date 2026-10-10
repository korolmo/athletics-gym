import { getContactStats } from "@/lib/services/contacts";
import { CONTACT_CHANNEL_LABEL_RU, contactSourceLabelRu, formatDayRu } from "@/lib/presentation/contact-labels";

export const dynamic = "force-dynamic";

const h2 = "mb-3 font-display text-xl uppercase tracking-wide";

/** Главная админки: сколько раз Посетители нажали кнопки связи — сегодня, за 7 и за 30 дней. */
export default async function AdminHome() {
  const stats = await getContactStats();
  const peak = Math.max(1, ...stats.days.map((d) => d.count));
  const channelMax = Math.max(1, ...stats.byChannel.map((c) => c.count));
  const sourceMax = Math.max(1, ...stats.bySource.map((s) => s.count));

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Обращения</h1>
        <p className="mt-1 text-sm text-muted">
          Сколько раз на сайте нажали кнопку WhatsApp, телефон или Instagram. Считаются нажатия, а не люди: кто нажал —
          сайт не знает и не запоминает. Ваши нажатия, пока вы в админке, не считаются.
        </p>
      </div>

      <section aria-label="Обращения по периодам" className="grid grid-cols-3 gap-2">
        {[
          ["Сегодня", stats.today],
          ["7 дней", stats.week],
          ["30 дней", stats.month],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card p-4">
            <div className="font-display text-4xl leading-none">{value}</div>
            <div className="mt-2 text-xs text-muted">{label}</div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className={h2}>По дням за 30 дней</h2>
        {stats.month === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
            За 30 дней Обращений пока нет. Как только кто-то нажмёт кнопку связи на сайте, здесь появится первый столбик.
          </p>
        ) : (
          <div className="rounded-2xl bg-card p-4">
            {/* Столбики — обычные блоки: высота в процентах от самого загруженного дня */}
            <ol aria-label="Обращения по дням" className="flex h-36 items-end gap-[3px]">
              {stats.days.map((d) => (
                <li
                  key={d.day}
                  title={`${formatDayRu(d.day)}: ${d.count}`}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end"
                >
                  <span className="sr-only">
                    {formatDayRu(d.day)}: {d.count}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`block w-full rounded-t-sm ${d.count > 0 ? "bg-accent" : "bg-line"}`}
                    style={{ height: d.count > 0 ? `${Math.max(6, Math.round((d.count / peak) * 100))}%` : "2px" }}
                  />
                </li>
              ))}
            </ol>
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>{formatDayRu(stats.days[0].day)}</span>
              <span>больше всего за день: {peak}</span>
              <span>сегодня</span>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className={h2}>По каналам</h2>
        <ul className="space-y-2">
          {stats.byChannel.map((c) => (
            <Bar key={c.channel} label={CONTACT_CHANNEL_LABEL_RU[c.channel]} count={c.count} max={channelMax} />
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className={h2}>Откуда нажимали</h2>
        {stats.bySource.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">Пока нечего показать.</p>
        ) : (
          <ul className="space-y-2">
            {stats.bySource.map((s) => (
              <Bar key={s.source} label={contactSourceLabelRu(s.source)} count={s.count} max={sourceMax} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">Разбивки — за последние 30 дней.</p>
      </section>
    </>
  );
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <li className="rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-semibold leading-snug">{label}</span>
        <span className="shrink-0 font-display text-xl leading-none">{count}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((count / max) * 100)}%` }} />
      </div>
    </li>
  );
}
