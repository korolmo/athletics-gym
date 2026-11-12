import { describe, expect, it } from "vitest";
import { addDays, formatClock, isDay, parseClock, weekdayOf, zonedParts, zonedToUtc } from "./time";

/** Пояс Клуба Athletic's Gym (Кызылорда, UTC+5 круглый год) */
const TZ = "Asia/Qyzylorda";

describe("время Клуба", () => {
  it("Кызылорда — UTC+5: 19:00 местного — 14:00 UTC", () => {
    expect(zonedToUtc("2026-11-11", 19 * 60, TZ).toISOString()).toBe("2026-11-11T14:00:00.000Z");
    expect(zonedToUtc("2026-11-11", 0, TZ).toISOString()).toBe("2026-11-10T19:00:00.000Z");
  });

  it("местный день наступает раньше UTC", () => {
    expect(zonedParts(new Date("2026-11-10T19:30:00Z"), TZ)).toEqual({ day: "2026-11-11", weekday: 3, minutes: 30 });
    expect(zonedParts(new Date("2026-11-10T18:59:00Z"), TZ).day).toBe("2026-11-10");
  });

  it("пояс с переводом часов тоже считается верно (Берлин, конец летнего времени)", () => {
    expect(zonedToUtc("2026-10-24", 12 * 60, "Europe/Berlin").toISOString()).toBe("2026-10-24T10:00:00.000Z");
    expect(zonedToUtc("2026-10-26", 12 * 60, "Europe/Berlin").toISOString()).toBe("2026-10-26T11:00:00.000Z");
  });

  it("дни и дни недели", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(weekdayOf("2026-11-09")).toBe(1);
    expect(weekdayOf("2026-11-15")).toBe(7);
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2028-02-29")).toBe(true);
  });

  it("часы и минуты", () => {
    expect(parseClock("9:30")).toBe(570);
    expect(parseClock("24:00")).toBe(1440);
    expect(parseClock("24:30")).toBeNull();
    expect(parseClock("10:60")).toBeNull();
    expect(parseClock("abc")).toBeNull();
    expect(formatClock(570)).toBe("09:30");
  });
});
