import { describe, expect, it } from "vitest";
import { MIN_LEAD_MS, checkWeek, computeWindows, isFreeWindow, isValidTimeOff, type TrainerSchedule } from "./schedule";

// Понедельник, 9 ноября 2026, 08:00 в Кызылорде (03:00 UTC)
const NOW = new Date("2026-11-09T03:00:00Z");
const at = (iso: string) => new Date(iso);

/** Пн и Ср 09:00–12:00, тренировка час. */
const base: TrainerSchedule = {
  sessionMinutes: 60,
  workHours: [
    { weekday: 1, startMin: 9 * 60, endMin: 12 * 60 },
    { weekday: 3, startMin: 9 * 60, endMin: 12 * 60 },
  ],
  timeOff: [],
};

const starts = (s: TrainerSchedule, busy = [] as { start: Date; end: Date }[], now = NOW, days = 3) =>
  computeWindows(s, busy, now, days).map((w) => w.start.toISOString());

describe("Окна Тренера", () => {
  it("идут от начала интервала с шагом в длительность; раньше чем через 2 часа — не показываются", () => {
    // 09:00 сегодня — через час, его нет; 10:00 — ровно через 2 часа, есть
    expect(starts(base)).toEqual([
      "2026-11-09T05:00:00.000Z",
      "2026-11-09T06:00:00.000Z",
      "2026-11-11T04:00:00.000Z",
      "2026-11-11T05:00:00.000Z",
      "2026-11-11T06:00:00.000Z",
    ]);
    expect(MIN_LEAD_MS).toBe(2 * 60 * 60 * 1000);
  });

  it("окно, которое не помещается в интервал целиком, не показывается", () => {
    const s = { ...base, sessionMinutes: 90, workHours: [{ weekday: 3, startMin: 9 * 60, endMin: 12 * 60 }] };
    expect(starts(s)).toEqual(["2026-11-11T04:00:00.000Z", "2026-11-11T05:30:00.000Z"]);
    const odd = { ...s, workHours: [{ weekday: 3, startMin: 9 * 60, endMin: 11 * 60 }] };
    expect(starts(odd)).toEqual(["2026-11-11T04:00:00.000Z"]);
  });

  it("занятое время вычитается, в том числе частично пересекающееся", () => {
    const busy = [
      { start: at("2026-11-11T04:00:00Z"), end: at("2026-11-11T05:00:00Z") },
      { start: at("2026-11-11T05:30:00Z"), end: at("2026-11-11T06:30:00Z") },
    ];
    expect(starts(base, busy).filter((s) => s.startsWith("2026-11-11"))).toEqual([]);
  });

  it("исключение убирает дни целиком, включая последний", () => {
    const s = { ...base, timeOff: [{ fromDay: "2026-11-10", toDay: "2026-11-11" }] };
    expect(starts(s).every((x) => x.startsWith("2026-11-09"))).toBe(true);
  });

  it("день считается по Кызылорде: в 00:30 местного понедельника (вс по UTC) «сегодня» — уже понедельник", () => {
    const lateSunday = new Date("2026-11-08T19:30:00Z"); // пн 00:30 в Кызылорде, вс 19:30 по UTC
    expect(starts(base, [], lateSunday, 1)).toEqual(["2026-11-09T04:00:00.000Z", "2026-11-09T05:00:00.000Z", "2026-11-09T06:00:00.000Z"]);
  });

  it("без часов работы Окон нет", () => {
    expect(starts({ ...base, workHours: [] }, [], NOW, 14)).toEqual([]);
  });

  it("isFreeWindow: только точное начало свободного Окна", () => {
    expect(isFreeWindow(base, [], at("2026-11-11T04:00:00Z"), NOW)).toBe(true);
    expect(isFreeWindow(base, [], at("2026-11-11T04:30:00Z"), NOW)).toBe(false);
    expect(isFreeWindow(base, [], at("2026-11-09T04:00:00Z"), NOW)).toBe(false);
  });
});

describe("шаблон недели", () => {
  const i = (weekday: number, s: number, e: number) => ({ weekday, startMin: s * 60, endMin: e * 60 });

  it("правильный шаблон проходит", () => expect(checkWeek(60, [i(1, 9, 13), i(1, 15, 20), i(7, 10, 12)])).toBeNull());
  it("длительность — 30–180, шаг 15", () => {
    expect(checkWeek(45, [])).toBeNull();
    expect(checkWeek(50, [])).toBe("sessionMinutes");
    expect(checkWeek(195, [])).toBe("sessionMinutes");
  });
  it("ошибки интервалов", () => {
    expect(checkWeek(60, [i(1, 13, 9)])).toBe("interval");
    expect(checkWeek(60, [i(8, 9, 10)])).toBe("interval");
    expect(checkWeek(90, [i(1, 9, 10)])).toBe("tooShort");
    expect(checkWeek(60, [i(1, 9, 12), i(1, 11, 14)])).toBe("overlap");
    expect(checkWeek(60, [i(1, 6, 7), i(1, 8, 9), i(1, 10, 11), i(1, 12, 13), i(1, 14, 15)])).toBe("tooMany");
  });
  it("исключение: даты по порядку, не длиннее 90 дней", () => {
    expect(isValidTimeOff({ fromDay: "2026-11-15", toDay: "2026-11-15" })).toBe(true);
    expect(isValidTimeOff({ fromDay: "2026-11-16", toDay: "2026-11-15" })).toBe(false);
    expect(isValidTimeOff({ fromDay: "2026-11-01", toDay: "2027-01-29" })).toBe(true);
    expect(isValidTimeOff({ fromDay: "2026-11-01", toDay: "2027-01-30" })).toBe(false);
    expect(isValidTimeOff({ fromDay: "2026-02-30", toDay: "2026-03-01" })).toBe(false);
  });
});
