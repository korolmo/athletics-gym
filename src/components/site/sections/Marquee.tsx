/**
 * Бегущая строка между блоками: «СИЛА • ВЫНОСЛИВОСТЬ • РЕЗУЛЬТАТ •» на жёлтом фоне.
 * Только CSS (globals.css): две одинаковые половины и сдвиг на одну — шва нет; при наведении останавливается,
 * при «меньше движения» стоит на месте. Для экранных читалок слова названы один раз.
 */
export function Marquee({ words }: { words: readonly string[] }) {
  const line = words.map((w) => `${w} •`).join(" ");
  // Половина должна быть не уже экрана: на телефоне хватает трёх повторов, остальные пять — только с планшета.
  // Так движущийся слой на телефоне втрое короче; скорость выравнивает длительность в globals.css
  const half = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className={i < 3 ? "px-2" : "hidden px-2 md:inline"}>
      {line}
    </span>
  ));
  return (
    <div className="marquee w-full overflow-hidden bg-primary-container py-3 text-on-primary" role="img" aria-label={words.join(". ")}>
      <div
        aria-hidden="true"
        className="marquee-track flex w-max whitespace-nowrap text-[15px] font-extrabold uppercase leading-6 tracking-[0.12em] md:text-headline-sm md:tracking-[0.14em]"
      >
        <div className="flex shrink-0">{half}</div>
        <div className="flex shrink-0">{half}</div>
      </div>
    </div>
  );
}
