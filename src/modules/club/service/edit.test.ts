import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CLUB } from "../domain/club";

// Сохранение Клуба (этап П1): что становится логотипом и что делает место для Фото «logo». База — в памяти.

const { state, db, requireOwner } = vi.hoisted(() => {
  const state = { logo: null as string | null, saved: null as Record<string, unknown> | null };
  const db = {
    club: {
      findUnique: vi.fn(async () => ({ logo: state.logo })),
      upsert: vi.fn(async ({ update }: { update: Record<string, unknown> }) => {
        state.saved = update;
        state.logo = update.logo as string | null;
      }),
      update: vi.fn(async ({ data }: { data: { logo: string | null } }) => {
        state.logo = data.logo;
      }),
    },
  };
  return { state, db, requireOwner: vi.fn(async () => {}) };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/modules/owner", () => ({ requireOwner }));

const { saveClub, setLogoPhoto, clearLogoPhoto, readLogoPhoto } = await import("./edit");

// Поля формы: всё, кроме логотипа (его задаёт logoMode) и пояса (его форма не меняет)
const base = Object.fromEntries(Object.entries(DEFAULT_CLUB).filter(([k]) => k !== "logo" && k !== "timeZone")) as Omit<typeof DEFAULT_CLUB, "logo" | "timeZone">;

beforeEach(() => {
  state.logo = null;
  state.saved = null;
  requireOwner.mockClear();
});

describe("сохранение Клуба", () => {
  it("исходный файл, монограмма; «Фото» без загруженного Фото — логотип не меняется", async () => {
    await saveClub({ ...base, logoMode: "file" });
    expect(state.logo).toBe(DEFAULT_CLUB.logo);
    await saveClub({ ...base, logoMode: "monogram" });
    expect(state.logo).toBeNull();
    state.logo = "/logo.png?v=2";
    await saveClub({ ...base, logoMode: "photo" });
    expect(state.logo).toBe("/logo.png?v=2");
    expect(requireOwner).toHaveBeenCalledTimes(3);
  });

  it("загруженное Фото остаётся при «Фото»; пояс формой не меняется", async () => {
    state.logo = "logo/a.webp";
    await saveClub({ ...base, logoMode: "photo" });
    expect(state.logo).toBe("logo/a.webp");
    expect(state.saved).not.toHaveProperty("timeZone");
  });
});

describe("место для Фото «logo»", () => {
  it("загрузка ставит Фото логотипом и отдаёт прежнее Фото; файл и монограмма — не Фото", async () => {
    state.logo = "/logo.png?v=2";
    expect(await readLogoPhoto()).toBeNull();
    expect(await setLogoPhoto("logo/a.webp")).toBeNull();
    expect(await setLogoPhoto("logo/b.webp")).toBe("logo/a.webp");
    expect(state.logo).toBe("logo/b.webp");
  });

  it("удаление Фото — монограмма; исходный файл удаление не трогает", async () => {
    state.logo = "logo/b.webp";
    expect(await clearLogoPhoto()).toBe("logo/b.webp");
    expect(state.logo).toBeNull();
    state.logo = "/logo.png?v=2";
    expect(await clearLogoPhoto()).toBeNull();
    expect(state.logo).toBe("/logo.png?v=2");
  });
});
