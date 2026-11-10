import { describe, expect, it, vi } from "vitest";

// Логотипы и иконки Клуба (этап П1, решения 12 и 16): у Athletic's Gym всё как было, у другого Клуба — из данных.

vi.mock("server-only", () => ({}));
vi.mock("@/modules/club", () => ({ getClub: vi.fn() }));
vi.mock("@/modules/tariffs", () => ({ listHallLogos: vi.fn() }));
vi.mock("@/modules/photos", () => ({ mediaUrl: (p: string | null) => (p ? `/media/${p}` : null) }));

const { logosFor } = await import("./brand");
const { DEFAULT_CLUB } = await import("@/modules/club/client");
const { siteIcons } = await import("@/lib/brand");

describe("логотипы Клуба", () => {
  it("Athletic's Gym: прежние файлы, прежние иконки, свой логотип Женского зала", () => {
    const l = logosFor(DEFAULT_CLUB, { general: null, women: "/logo-women.png?v=1" });
    expect(l.club).toEqual({ kind: "image", src: "/logo.png?v=2" });
    expect(l.women).toEqual({ kind: "image", src: "/logo-women.png?v=1" });
    expect(l.icons).toEqual(siteIcons);
    expect(l.jsonLdPath).toBe("/logo.png");
  });

  it("без логотипа — монограмма цвета акцента; у Зала без своего — логотип Клуба; иконка — SVG", () => {
    const club = { ...DEFAULT_CLUB, name: "Iron Club", logo: null, accentColor: "#4fc3f7" };
    const l = logosFor(club, { women: null });
    expect(l.club).toMatchObject({ kind: "monogram", text: "IC", bg: "#4fc3f7" });
    expect(l.women).toEqual(l.club);
    expect(l.icons.small.startsWith("data:image/svg+xml,")).toBe(true);
    expect(l.jsonLdPath).toBeNull();
  });

  it("загруженное Фото — адрес /media/…, иконки — оно же", () => {
    const l = logosFor({ ...DEFAULT_CLUB, logo: "gallery/x.webp" });
    expect(l.club).toEqual({ kind: "image", src: "/media/gallery/x.webp" });
    expect(l.icons.small).toBe("/media/gallery/x.webp");
  });
});
