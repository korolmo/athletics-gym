import { describe, expect, it } from "vitest";
import { logoSource, monogramSvg, monogramText } from "./logo";

describe("логотип: вид по полю", () => {
  it("«/…» — файл, путь — Фото, пусто — монограмма", () => {
    expect(logoSource("/logo.png?v=2")).toEqual({ kind: "file", src: "/logo.png?v=2" });
    expect(logoSource("gallery/abc.webp")).toEqual({ kind: "photo", path: "gallery/abc.webp" });
    expect(logoSource(null)).toEqual({ kind: "monogram" });
    expect(logoSource("  ")).toEqual({ kind: "monogram" });
  });
});

describe("монограмма", () => {
  it("первые буквы двух слов, одно слово — две буквы, казахские буквы — как есть", () => {
    expect(monogramText("Athletic's Gym")).toBe("AG");
    expect(monogramText("Iron Club")).toBe("IC");
    expect(monogramText("арена")).toBe("АР");
    expect(monogramText("Қуат спорт")).toBe("ҚС");
    expect(monogramText("24/7 Fitness Lab")).toBe("FL");
    expect(monogramText("!!!")).toBe("•");
  });

  it("SVG экранирует текст и цвета", () => {
    const svg = monogramSvg({ text: "<A>", bg: "#4fc3f7", fg: '"x"' });
    expect(svg).toContain("&lt;A&gt;");
    expect(svg).not.toContain('"x"');
  });
});
