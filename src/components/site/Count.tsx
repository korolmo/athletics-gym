// Числа рейтинга 2ГИС, которые отсчитываются от нуля (см. Motion.tsx). Сервер отдаёт готовое значение:
// без скрипта и при «меньше движения» число просто стоит на месте.

/** «5,0»: десятичная запятая, как принято в русском и казахском. */
export function CountNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  return (
    <span data-count={value} data-decimals={decimals} className="tabular-nums">
      {decimals ? value.toFixed(decimals).replace(".", ",") : value}
    </span>
  );
}

/** Фраза с числом внутри («405 оценок в 2ГИС»): отсчитывается только число, слова стоят. */
export function CountText({ text, n }: { text: string; n: number }) {
  const at = text.indexOf(String(n));
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <CountNumber value={n} />
      {text.slice(at + String(n).length)}
    </>
  );
}
