import { Fragment, type CSSProperties } from "react";

/** Один пункт ленты и звёздочка после него. */
function Line({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <Fragment key={i}>
          <span>{item}</span>
          <span className="px-4 text-[0.7em] md:px-6">★</span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * Бегущая строка под первым экраном: факты о зале из Настроек сайта, между ними ★, на жёлтой ленте.
 * Лента наклонена на −2° и шире экрана — её краёв не видно; отступы сверху и снизу вмещают наклон.
 * Шрифт Oswald лента получает после загрузки страницы (globals.css, data-late-fonts) — его файлы не мешают первой отрисовке.
 * Движение — только CSS (globals.css), одним transform: две одинаковые половины и сдвиг на одну — шва нет; при наведении
 * и пока лента не на экране — стоит (motion-run.ts), при «меньше движения» стоит на месте (с отступом слева — первый пункт
 * виден целиком). Для экранных читалок пункты названы один раз.
 */
export function Marquee({ items }: { items: readonly string[] }) {
  // Длина одного прохода пунктов в знаках (звёздочка с отступами — примерно три знака)
  const chars = items.reduce((n, item) => n + item.length + 3, 0);
  // Половина ленты должна быть не уже самой ленты (106% экрана): повторяем пункты, пока не наберётся ширина, — и не больше.
  // Сколько знаков для этого нужно, зависит от экрана: телефон (до 768 px, знак ~12 px, с запасом 10) — 90,
  // планшет и ноутбук (до 1536 px, знак ~16,5 px, с запасом 14) — 120, широкий экран (до ~2900 px) — 220.
  // Лишние для своего экрана копии скрыты (display: none): браузер их не раскладывает и не рисует
  const copies = (need: number) => Math.min(60, Math.max(1, Math.ceil(need / chars)));
  const [narrow, mid, wide] = [copies(90), copies(120), copies(220)];
  const half = Array.from({ length: wide }, (_, i) => (
    <span key={i} className={i < narrow ? "flex items-center" : i < mid ? "hidden items-center md:flex" : "hidden items-center 2xl:flex"}>
      <Line items={items} />
    </span>
  ));
  // Скорость постоянная: чем длиннее половина, тем дольше проход
  const duration = {
    "--marquee-s": `${Math.round(chars * narrow * 0.09)}s`,
    "--marquee-s-md": `${Math.round(chars * mid * 0.11)}s`,
    "--marquee-s-2xl": `${Math.round(chars * wide * 0.11)}s`,
  } as CSSProperties;
  return (
    <div className="pointer-events-none relative z-10 -my-[1.5vw] overflow-hidden py-[2vw]" role="img" aria-label={items.join(". ")}>
      <div className="marquee pointer-events-auto -ml-[3vw] w-[106vw] -rotate-2 bg-primary-container py-2.5 text-on-primary md:py-3">
        <div
          aria-hidden="true"
          style={duration}
          className="marquee-track flex w-max motion-reduce:pl-[4vw] whitespace-nowrap text-[20px] font-semibold uppercase leading-7 tracking-[0.04em] md:text-[28px] md:leading-9"
        >
          <div className="flex shrink-0">{half}</div>
          <div className="flex shrink-0">{half}</div>
        </div>
      </div>
    </div>
  );
}
