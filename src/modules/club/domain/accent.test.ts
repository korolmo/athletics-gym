import { describe, expect, it } from "vitest";
import { ACCENT_SURFACES, MIN_CONTRAST, accentCssVars, accentPalette, contrastRatio, normalizeHex } from "./accent";
import { DEFAULT_CLUB } from "./club";

// Цвет акцента (этап П1, решение 3): любой принятый цвет читается на всех фонах, и текст на нём читается.

describe("контраст по WCAG", () => {
  it("чёрный на белом — 21, одинаковые — 1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#f5e642", "#f5e642")).toBe(1);
  });

  it("цвет — только #RRGGBB", () => {
    expect(normalizeHex(" #F5E642 ")).toBe("#f5e642");
    expect(normalizeHex("f5e642")).toBeNull();
    expect(normalizeHex("#fff")).toBeNull();
  });
});

describe("палитра акцента", () => {
  it("начальный жёлтый принимается, текст на нём — тёмный", () => {
    const r = accentPalette(DEFAULT_CLUB.accentColor);
    expect(r.ok).toBe(true);
    if (r.ok) expect(contrastRatio(r.palette.ink, r.palette.accent)).toBeGreaterThan(9);
  });

  it("тёмный цвет не принимается — на тёмном сайте он не читается", () => {
    for (const c of ["#1a237e", "#8b0000", "#333333", "#7a1fa2"]) {
      const r = accentPalette(c);
      expect(r.ok, c).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/темный|тёмный|контраст/i);
    }
  });

  it("любой принятый цвет: акцент ≥ 4,5 на всех фонах, текст на акценте ≥ 4,5", () => {
    // Перебор по сетке цветов: правило держится не на примерах, а на всём пространстве
    let accepted = 0;
    for (let r = 0; r < 256; r += 17)
      for (let g = 0; g < 256; g += 17)
        for (let b = 0; b < 256; b += 17) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          const res = accentPalette(hex);
          if (!res.ok) continue;
          accepted++;
          for (const s of ACCENT_SURFACES) expect(contrastRatio(res.palette.accent, s), `${hex} на ${s}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
          expect(contrastRatio(res.palette.ink, res.palette.accent), `текст на ${hex}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
        }
    expect(accepted).toBeGreaterThan(1000);
  });

  it("на светлом цвете текст тёмный, на среднем — белый не нужен: тёмный оттенок или почти чёрный", () => {
    const r = accentPalette("#4fc3f7");
    expect(r.ok && r.palette.ink).not.toBe("#ffffff");
  });
});

describe("CSS-переменные темы", () => {
  it("начальный цвет — без переменных: сайт не меняется ни на байт", () => {
    expect(accentCssVars("#F5E642", DEFAULT_CLUB.accentColor)).toEqual({});
  });

  it("другой цвет — все шесть токенов акцента", () => {
    const vars = accentCssVars("#4fc3f7", DEFAULT_CLUB.accentColor);
    expect(Object.keys(vars).sort()).toEqual(
      ["--color-accent", "--color-accent-ink", "--color-on-primary", "--color-on-primary-container", "--color-primary-container", "--color-surface-tint"].sort(),
    );
    expect(vars["--color-primary-container"]).toBe("#4fc3f7");
  });

  it("негодный цвет — без переменных", () => {
    expect(accentCssVars("#000080", DEFAULT_CLUB.accentColor)).toEqual({});
  });
});
