import { describe, expect, it } from "vitest";
import { guestLoginEnabled } from "./guest";
import { readSession, signSession } from "./session";

// Гость демо-админки (этап П1, ADR 0019): вход только в Лаборатории, роль подписана в токене.

const SECRET = "x".repeat(32);

describe("гостевой вход включён только в Лаборатории с GUEST_DEMO=1", () => {
  it("боевой сайт и локальный запуск — никогда", () => {
    expect(guestLoginEnabled({ APP_ENV: "production", GUEST_DEMO: "1" })).toBe(false);
    expect(guestLoginEnabled({ GUEST_DEMO: "1" })).toBe(false);
    expect(guestLoginEnabled({ APP_ENV: "lab" })).toBe(false);
    expect(guestLoginEnabled({ APP_ENV: "lab", GUEST_DEMO: "0" })).toBe(false);
    expect(guestLoginEnabled({ APP_ENV: "lab", GUEST_DEMO: "1" })).toBe(true);
  });
});

describe("роль в токене сессии", () => {
  const exp = Date.now() + 60_000;

  it("Гость — роль guest; Владелец и токены без роли (выданные до П1) — owner", async () => {
    expect(await readSession(await signSession(SECRET, { version: 3, expiresAt: exp, role: "guest" }), SECRET)).toEqual({ version: 3, expiresAt: exp, role: "guest" });
    expect(await readSession(await signSession(SECRET, { version: 3, expiresAt: exp }), SECRET)).toMatchObject({ role: "owner" });
  });

  it("роль нельзя дописать или стереть: подпись перестаёт сходиться", async () => {
    const guest = await signSession(SECRET, { version: 3, expiresAt: exp, role: "guest" });
    const forged = guest.replace(".guest.", ".");
    expect(await readSession(forged, SECRET)).toBeNull();
    const owner = await signSession(SECRET, { version: 3, expiresAt: exp });
    const dot = owner.lastIndexOf(".");
    expect(await readSession(`${owner.slice(0, dot)}.guest${owner.slice(dot)}`, SECRET)).toBeNull();
  });
});
