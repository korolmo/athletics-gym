// Логотип Клуба и Зала (этап П1, решения 12 и 16, ADR 0018): одно поле с адресом, три вида. Чистый код.

/** Как показывать логотип: картинка по адресу (файл из public/ или Фото) или монограмма из названия. */
export type LogoView = { kind: "image"; src: string } | { kind: "monogram"; text: string; bg: string; fg: string };

/** Вид логотипа по полю: «/…» — файл из public/, иначе — путь к Фото, пусто — монограмма. */
export type LogoSource = { kind: "file"; src: string } | { kind: "photo"; path: string } | { kind: "monogram" };

export function logoSource(value: string | null | undefined): LogoSource {
  const v = value?.trim();
  if (!v) return { kind: "monogram" };
  return v.startsWith("/") ? { kind: "file", src: v } : { kind: "photo", path: v };
}

/**
 * Буквы монограммы: первые буквы двух первых слов («Athletic's Gym» → «AG», «Iron Club» → «IC»); одно слово —
 * две первые буквы («Арена» → «АР»). Знаки и цифры пропускаются; букв нет — «•».
 */
export function monogramText(name: string): string {
  const words = name.match(/\p{L}[\p{L}\p{M}'’]*/gu) ?? [];
  if (words.length === 0) return "•";
  const text = words.length === 1 ? [...words[0]].slice(0, 2).join("") : words.slice(0, 2).map((w) => [...w][0]).join("");
  return text.toLocaleUpperCase("ru");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Монограмма как SVG-файл — для иконки вкладки (data: URL), где компонент не нарисовать. */
export function monogramSvg(m: { text: string; bg: string; fg: string }): string {
  const size = m.text.length > 1 ? 40 : 52;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<circle cx="50" cy="50" r="50" fill="${esc(m.bg)}"/>` +
    `<text x="50" y="50" dy=".35em" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-weight="800" font-size="${size}" fill="${esc(m.fg)}">${esc(m.text)}</text>` +
    `</svg>`
  );
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
