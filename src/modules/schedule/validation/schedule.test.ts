import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTimeOff, parseWorkWeek } from "./schedule";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("форма часов работы", () => {
  it("собирает интервалы по дням, пустые пары пропускает, выключенный день игнорирует", () => {
    const r = parseWorkWeek(
      form({ sessionMinutes: "60", "start-1-0": "09:00", "end-1-0": "13:00", "start-1-1": "", "end-1-1": "", "start-2-0": "10:00", "end-2-0": "12:00", "off-2": "on" }),
    );
    expect(r).toEqual({ ok: true, data: { sessionMinutes: 60, intervals: [{ weekday: 1, startMin: 540, endMin: 780 }] } });
  });

  it("половина пары и пересечение — ошибки", () => {
    expect(parseWorkWeek(form({ sessionMinutes: "60", "start-1-0": "09:00" })).ok).toBe(false);
    expect(parseWorkWeek(form({ sessionMinutes: "60", "start-1-0": "09:00", "end-1-0": "12:00", "start-1-1": "11:00", "end-1-1": "13:00" }))).toEqual({
      ok: false,
      error: "Интервалы одного дня не должны пересекаться.",
    });
    expect(parseWorkWeek(form({ sessionMinutes: "abc" })).ok).toBe(false);
  });
});

describe("форма исключения", () => {
  it("один день — «по» можно не заполнять", () => {
    expect(parseTimeOff(form({ fromDay: "2026-11-25", note: "выходной" }))).toEqual({
      ok: true,
      data: { fromDay: "2026-11-25", toDay: "2026-11-25", note: "выходной" },
    });
  });
  it("перепутанные даты — ошибка", () => expect(parseTimeOff(form({ fromDay: "2026-11-25", toDay: "2026-11-20" })).ok).toBe(false));
});

describe("сервис Окон: доступ", () => {
  // Без сессии Владельца — только функции для кабинета и модуля Записи; всё остальное начинается с requireOwner
  const PUBLIC = ["isWindowFree", "listWindows", "sessionMinutesOf"];
  it("каждая экспортируемая функция либо проверяет сессию, либо в списке публичных", () => {
    // Переводы строк — как в CI (LF): на Windows git может выдать файл с CRLF
    const src = fs
      .readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../service/schedule.ts"), "utf8")
      .replace(/\r\n/g, "\n");
    // Тело — после первой строки, которая кончается на « {»: сигнатура с типом-объектом в параметрах не мешает
    const fns = src
      .split("export async function ")
      .slice(1)
      .map((chunk) => ["", chunk.slice(0, chunk.indexOf("(")), chunk.slice(chunk.indexOf(" {\n") + 3)] as const);
    expect(fns.length).toBeGreaterThan(0);
    for (const [, name, body] of fns) {
      if (PUBLIC.includes(name)) expect(body, name).not.toContain("requireOwner");
      else expect(body, name).toMatch(/^\s*await requireOwner\(\);/);
    }
  });
});
