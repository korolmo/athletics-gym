import { describe, expect, it } from "vitest";
import { checked, optionalInt, text } from "./form";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("разбор полей формы", () => {
  it("text обрезает пробелы, отсутствующее поле — пустая строка", () => {
    expect(text(form({ name: "  Айша  " }), "name")).toBe("Айша");
    expect(text(form({}), "name")).toBe("");
  });

  it("optionalInt: пусто → null, пробелы в числе допустимы, мусор → NaN", () => {
    expect(optionalInt("")).toBeNull();
    expect(optionalInt("   ")).toBeNull();
    expect(optionalInt("12 000")).toBe(12000);
    expect(optionalInt("0")).toBe(0);
    expect(optionalInt("abc")).toBeNaN();
  });

  it("checked: отмечен только при значении on", () => {
    expect(checked(form({ isVisible: "on" }), "isVisible")).toBe(true);
    expect(checked(form({}), "isVisible")).toBe(false);
  });
});
