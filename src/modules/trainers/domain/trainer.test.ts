import { describe, expect, it } from "vitest";
import { sortOrderOnCreate, sortOrderOnUpdate } from "./trainer";

describe("порядок Тренера", () => {
  it("при правке пустое поле не меняет порядок (раньше сбрасывало в 0)", () => {
    expect(sortOrderOnUpdate(null)).toEqual({});
    expect("sortOrder" in sortOrderOnUpdate(null)).toBe(false);
  });

  it("при правке заданное число сохраняется, включая 0", () => {
    expect(sortOrderOnUpdate(7)).toEqual({ sortOrder: 7 });
    expect(sortOrderOnUpdate(0)).toEqual({ sortOrder: 0 });
  });

  it("новый Тренер без порядка встаёт в конец списка Зала", () => {
    expect(sortOrderOnCreate(null, 4)).toBe(5);
    expect(sortOrderOnCreate(null, null)).toBe(0);
  });

  it("новому Тренеру можно задать порядок явно", () => {
    expect(sortOrderOnCreate(2, 9)).toBe(2);
    expect(sortOrderOnCreate(0, 9)).toBe(0);
  });
});
