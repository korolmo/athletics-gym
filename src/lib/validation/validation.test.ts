import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/admin/limits";
import { parseTariffForm } from "./tariff";
import { parseTrainerForm } from "./trainer";

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const error = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error);

describe("Тариф из формы", () => {
  const visits = { category: "VISITS", hallId: "general", visitsPerMonth: "12", access: "DAY", audience: "STUDENTS", price: "10 000", isVisible: "on" };

  it("абонемент на посещения: нормализует числа, пробелы в цене допустимы", () => {
    const r = parseTariffForm(form(visits));
    expect(r).toEqual({
      ok: true,
      data: {
        id: null,
        hallId: "general",
        trainerId: null,
        category: "VISITS",
        titleRu: null,
        titleKk: null,
        visitsPerMonth: 12,
        durationMonths: null,
        access: "DAY",
        audience: "STUDENTS",
        price: 10000,
        priceTo: null,
        isVisible: true,
      },
    });
  });

  it("поля чужой Категории отбрасываются, даже если пришли из формы", () => {
    const r = parseTariffForm(
      form({ category: "SINGLE", hallId: "women", price: "3000", visitsPerMonth: "12", durationMonths: "6", access: "DAY", audience: "MEN", titleRu: "лишнее", priceTo: "9999", trainerId: "tr1" }),
    );
    expect(r.ok && r.data).toMatchObject({
      category: "SINGLE",
      visitsPerMonth: null,
      durationMonths: null,
      access: "FULL",
      audience: "ALL",
      titleRu: null,
      priceTo: null,
      trainerId: null,
      isVisible: false,
    });
  });

  it("безлимит требует срок в месяцах", () => {
    expect(error(parseTariffForm(form({ category: "UNLIMITED", hallId: "general", price: "25000" })))).toBe("Срок — целое число месяцев, от 1");
    expect(error(parseTariffForm(form({ category: "UNLIMITED", hallId: "general", price: "25000", durationMonths: "0" })))).toBe("Срок — целое число месяцев, от 1");
    const ok = parseTariffForm(form({ category: "UNLIMITED", hallId: "general", price: "25000", durationMonths: "3" }));
    expect(ok.ok && ok.data.durationMonths).toBe(3);
  });

  it("персональная: только с Тренером; пустое число тренировок — разовая; диапазон цены", () => {
    expect(error(parseTariffForm(form({ category: "PERSONAL", hallId: "women", price: "2000", audience: "ALL" })))).toBe("Персональный тариф добавляется в карточке тренера");
    const once = parseTariffForm(form({ category: "PERSONAL", hallId: "women", trainerId: "tr1", price: "2000", audience: "ALL" }));
    expect(once.ok && once.data).toMatchObject({ trainerId: "tr1", visitsPerMonth: null, priceTo: null });
    const range = parseTariffForm(form({ category: "PERSONAL", hallId: "general", trainerId: "tr1", visitsPerMonth: "12", price: "15000", priceTo: "25000", audience: "MEN", titleRu: "1+1" }));
    expect(range.ok && range.data).toMatchObject({ visitsPerMonth: 12, price: 15000, priceTo: 25000, audience: "MEN", titleRu: "1+1" });
  });

  it.each([
    [{ ...visits, category: "MONTHLY" }, "Выберите категорию"],
    [{ ...visits, hallId: "vip" }, "Выберите зал"],
    [{ ...visits, price: "" }, "Цена — целое число в тенге, например 12000"],
    [{ ...visits, price: "abc" }, "Цена — целое число в тенге, например 12000"],
    [{ ...visits, price: "-5" }, "Цена — целое число в тенге, например 12000"],
    [{ ...visits, price: "12.5" }, "Цена — целое число в тенге, например 12000"],
    [{ ...visits, price: String(LIMITS.price + 1) }, `Цена не больше ${LIMITS.price} ₸`],
    [{ ...visits, visitsPerMonth: "" }, "Укажите число посещений в месяц"],
    [{ ...visits, visitsPerMonth: "0" }, "Число в месяц — целое, от 1"],
    [{ ...visits, visitsPerMonth: "1000" }, `Число в месяц — не больше ${LIMITS.visitsPerMonth}`],
    [{ ...visits, access: "NIGHT" }, "Выберите время доступа"],
    [{ ...visits, audience: "KIDS" }, "Выберите аудиторию"],
  ])("ошибка: %o → %s", (values, message) => {
    expect(error(parseTariffForm(form(values as Record<string, string>)))).toBe(message);
  });

  it("диапазон: «до» должно быть больше цены и в пределах", () => {
    const base = { category: "PERSONAL", hallId: "general", trainerId: "tr1", price: "15000", audience: "ALL" };
    expect(error(parseTariffForm(form({ ...base, priceTo: "15000" })))).toBe("Верхняя граница диапазона должна быть больше цены");
    expect(error(parseTariffForm(form({ ...base, priceTo: "100" })))).toBe("Верхняя граница диапазона должна быть больше цены");
    expect(error(parseTariffForm(form({ ...base, priceTo: String(LIMITS.price + 1) })))).toBe(`Цена не больше ${LIMITS.price} ₸`);
  });

  it("слишком длинное уточнение отклоняется", () => {
    const r = parseTariffForm(form({ category: "PERSONAL", hallId: "general", trainerId: "tr1", price: "100", audience: "ALL", titleRu: "я".repeat(LIMITS.title + 1) }));
    expect(error(r)).toBe(`Уточнение — не длиннее ${LIMITS.title} символов`);
  });

  it("id сохраняется для правки", () => {
    const r = parseTariffForm(form({ ...visits, id: "abc123" }));
    expect(r.ok && r.data.id).toBe("abc123");
  });
});

describe("Тренер из формы", () => {
  const base = { name: "  Айша ", hallId: "women", sortOrder: "3", descriptionRu: "", descriptionKk: "", isVisible: "on" };

  it("нормализует: обрезает имя, пустое описание → null", () => {
    expect(parseTrainerForm(form(base))).toEqual({
      ok: true,
      data: { id: null, name: "Айша", hallId: "women", sortOrder: 3, descriptionRu: null, descriptionKk: null, isVisible: true },
    });
  });

  it("пустой порядок — «не задан» (null), а не ноль", () => {
    const r = parseTrainerForm(form({ ...base, sortOrder: "" }));
    expect(r.ok && r.data.sortOrder).toBeNull();
    const zero = parseTrainerForm(form({ ...base, sortOrder: "0" }));
    expect(zero.ok && zero.data.sortOrder).toBe(0);
  });

  it.each([
    [{ ...base, name: "   " }, "Заполните имя"],
    [{ ...base, name: "я".repeat(LIMITS.name + 1) }, `Имя — не длиннее ${LIMITS.name} символов`],
    [{ ...base, hallId: "roof" }, "Выберите зал"],
    [{ ...base, sortOrder: "-1" }, "Порядок — целое число от 0"],
    [{ ...base, sortOrder: "1.5" }, "Порядок — целое число от 0"],
    [{ ...base, sortOrder: "abc" }, "Порядок — целое число от 0"],
    [{ ...base, sortOrder: String(LIMITS.sortOrder + 1) }, `Порядок — не больше ${LIMITS.sortOrder}`],
    [{ ...base, descriptionRu: "я".repeat(LIMITS.description + 1) }, `Описание — не длиннее ${LIMITS.description} символов`],
    [{ ...base, descriptionKk: "я".repeat(LIMITS.description + 1) }, `Описание — не длиннее ${LIMITS.description} символов`],
  ])("ошибка: %o → %s", (values, message) => {
    const r = parseTrainerForm(form(values));
    expect(r.ok ? null : r.error).toBe(message);
  });
});
