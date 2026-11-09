import { getContactStats } from "@/modules/contacts";
import { CONTACT_CHANNEL_LABEL_RU, contactSourceLabelRu, formatDayRu } from "@/modules/contacts/client";
import { CallSym, ChatSym, PhotoCameraSym, ScheduleSym } from "@/components/symbols";
import { InfoSym } from "@/components/cabinet/icons";
import { CardTitle, Empty, PageHead, card } from "../ui";

export const dynamic = "force-dynamic";

// Главная админки — Обращения, по макетам А2 (design/stitch/admin/a2-obrashcheniya-*.png). Только то, что сайт
// действительно знает: нажатия по дням, каналам и местам. «+18 % к прошлому месяцу» и «Обновлено в 19:40» из макета нет:
// месяцев назад счётчик не хранит, а данные и так свежие на момент открытия страницы.

const CHANNEL_STYLE: Record<string, { bar: string; icon: string; Icon: (p: { className?: string }) => React.ReactNode }> = {
  whatsapp: { bar: "bg-wa", icon: "bg-wa/15 text-wa", Icon: ChatSym },
  phone: { bar: "bg-accent", icon: "bg-accent/15 text-accent", Icon: CallSym },
  instagram: { bar: "bg-muted", icon: "bg-card-2 text-muted", Icon: PhotoCameraSym },
};

function plural(n: number): string {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return "нажатие";
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return "нажатия";
  return "нажатий";
}

function pct(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";
}

export default async function AdminHome() {
  const stats = await getContactStats();
  const peak = Math.max(1, ...stats.days.map((d) => d.count));
  const yesterday = stats.days.at(-2)?.count ?? 0;
  const diff = stats.today - yesterday;
  const channelTotal = stats.byChannel.reduce((s, c) => s + c.count, 0);
  const sourceTotal = stats.bySource.reduce((s, x) => s + x.count, 0);
  const sourceMax = Math.max(1, ...stats.bySource.map((s) => s.count));

  const tiles = [
    { label: "Сегодня", value: stats.today, note: diff === 0 ? "как вчера" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} к вчера`, up: diff > 0 },
    { label: "7 дней", value: stats.week, note: `в среднем ${(stats.week / 7).toFixed(1).replace(".", ",")} в день` },
    { label: "30 дней", value: stats.month, note: "всего за месяц" },
  ];

  return (
    <>
      <PageHead title="Обращения" subtitle="Нажатия на кнопки связи на сайте · без персональных данных" />

      <section aria-label="Обращения по периодам" className="grid grid-cols-3 gap-3 lg:gap-5">
        {tiles.map((t, i) => (
          <div key={t.label} className={`${card} p-4 lg:p-6 ${i === 0 ? "border-t-4 border-t-accent" : ""}`}>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted">
              {t.label}
              <ScheduleSym className="hidden h-5 w-5 text-accent sm:block" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold leading-none lg:text-6xl ${i === 0 ? "text-accent lg:text-fg" : ""}`}>{t.value}</span>
              <span className="hidden text-sm font-semibold text-muted lg:inline">{plural(t.value)}</span>
            </div>
            <p className={`mt-3 text-xs lg:text-sm ${t.up ? "text-wa" : "text-muted"}`}>{t.note}</p>
          </div>
        ))}
      </section>

      <section className={`${card} mt-5 lg:p-6`}>
        <CardTitle title="По дням за 30 дней" aside={`${stats.month} ${plural(stats.month)}`} />
        {stats.month === 0 ? (
          <Empty>За 30 дней Обращений пока нет. Как только кто-то нажмёт кнопку связи на сайте, здесь появится первый столбик.</Empty>
        ) : (
          <>
            <ol aria-label="Обращения по дням" className="flex h-44 items-end gap-[3px] border-b border-line lg:h-56 lg:gap-1.5">
              {stats.days.map((d, i) => {
                const today = i === stats.days.length - 1;
                return (
                  <li key={d.day} title={`${formatDayRu(d.day)}: ${d.count}`} className="relative flex h-full min-w-0 flex-1 flex-col justify-end">
                    <span className="sr-only">
                      {formatDayRu(d.day)}: {d.count}
                    </span>
                    {today && d.count > 0 && (
                      <span aria-hidden="true" className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-accent px-1.5 text-xs font-bold text-accent-ink">
                        {d.count}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className={`block w-full rounded-t ${today ? "bg-accent" : "bg-card-2"}`}
                      style={{ height: d.count > 0 ? `${Math.max(4, Math.round((d.count / peak) * 100))}%` : "2px" }}
                    />
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 flex justify-between text-xs text-muted">
              <span>{formatDayRu(stats.days[0].day)}</span>
              <span className="font-semibold text-accent">● Сегодня ({stats.today})</span>
            </div>
          </>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className={`${card} lg:p-6`}>
          <CardTitle title="По каналам" aside={`всего ${channelTotal}`} />
          <ul className="space-y-5">
            {stats.byChannel.map((c) => {
              const style = CHANNEL_STYLE[c.channel] ?? CHANNEL_STYLE.instagram;
              return (
                <li key={c.channel}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.icon}`}>
                      <style.Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 font-semibold">{CONTACT_CHANNEL_LABEL_RU[c.channel]}</span>
                    <span className="text-lg font-extrabold">{c.count}</span>
                    <span className="w-11 text-right text-xs text-muted">{pct(c.count, channelTotal)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                    <div className={`h-full rounded-full ${style.bar}`} style={{ width: pct(c.count, Math.max(1, channelTotal)) }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${card} lg:p-6`}>
          <CardTitle title="Откуда нажимали" aside={`${stats.bySource.length} мест`} />
          {stats.bySource.length === 0 ? (
            <Empty>Пока нечего показать.</Empty>
          ) : (
            <ol className="space-y-4">
              {stats.bySource.map((s, i) => (
                <li key={s.source} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${i === 0 ? "bg-accent text-accent-ink" : "bg-card-2 text-muted"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{contactSourceLabelRu(s.source)}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg">
                      <span className={`block h-full rounded-full ${i === 0 ? "bg-accent" : "bg-muted/60"}`} style={{ width: `${Math.round((s.count / sourceMax) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="w-10 text-right text-lg font-extrabold">{s.count}</span>
                  <span className="w-10 text-right text-xs text-muted">{pct(s.count, sourceTotal)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className={`${card} mt-5 flex items-start gap-3 text-sm text-muted`}>
        <InfoSym className="mt-0.5 h-5 w-5 shrink-0" />
        Разбивки — за последние 30 дней. Считаются нажатия, а не люди: кто нажал и написал ли — сайт не знает. Ваши нажатия, пока
        вы в админке, не считаются.
      </p>
    </>
  );
}
