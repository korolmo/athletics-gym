import { describe, expect, it } from "vitest";
import { lastResetBoundary, resetDue } from "./reset";

// Пояс Клуба — UTC+5: 04:00 по времени Клуба — 23:00 UTC накануне.

describe("когда сбрасывать демо", () => {
  it("граница — последние 04:00 по времени Клуба", () => {
    expect(lastResetBoundary(new Date("2026-11-11T10:00:00Z")).toISOString()).toBe("2026-11-10T23:00:00.000Z");
    // 03:30 по Клубу (22:30 UTC) — граница ещё вчерашняя
    expect(lastResetBoundary(new Date("2026-11-11T22:30:00Z")).toISOString()).toBe("2026-11-10T23:00:00.000Z");
    expect(lastResetBoundary(new Date("2026-11-11T23:00:00Z")).toISOString()).toBe("2026-11-11T23:00:00.000Z");
  });

  it("сброса не было — пора; был после границы — нет; был до — пора", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    expect(resetDue(null, now)).toBe(true);
    expect(resetDue(new Date("2026-11-10T23:05:00Z"), now)).toBe(false);
    expect(resetDue(new Date("2026-11-10T22:59:00Z"), now)).toBe(true);
  });

  it("за сутки — ровно один сброс: в 03:59 после вчерашнего — нет, в 04:00 — да", () => {
    const last = new Date("2026-11-10T23:00:30Z");
    expect(resetDue(last, new Date("2026-11-11T22:59:00Z"))).toBe(false);
    expect(resetDue(last, new Date("2026-11-11T23:00:00Z"))).toBe(true);
  });
});
