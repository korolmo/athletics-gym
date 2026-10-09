import { beforeEach, describe, expect, it, vi } from "vitest";

// Граница доступа к данным админки: без действующей сессии requireOwner() не возвращает управление.

const { isAuthed, redirect } = vi.hoisted(() => ({
  isAuthed: vi.fn(async () => false),
  // Как в Next: redirect() не возвращается, а бросает исключение
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT;${to}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ isAuthed }));
vi.mock("next/navigation", () => ({ redirect }));

import { requireOwner } from "./guard";

beforeEach(() => vi.clearAllMocks());

describe("requireOwner", () => {
  it("сессии нет — перенаправление на вход, код после проверки не выполняется", async () => {
    isAuthed.mockResolvedValueOnce(false);
    const afterCheck = vi.fn();
    await expect(
      (async () => {
        await requireOwner();
        afterCheck();
      })(),
    ).rejects.toThrow("NEXT_REDIRECT;/admin/login");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
    expect(afterCheck).not.toHaveBeenCalled();
  });

  it("сессия действует — проверка пройдена без перенаправления", async () => {
    isAuthed.mockResolvedValueOnce(true);
    await expect(requireOwner()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
