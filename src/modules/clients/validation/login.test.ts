import { describe, expect, it } from "vitest";
import { parseCodeRequest, parseCodeVerify, parseProfile } from "./login";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("формы входа Клиента", () => {
  it("номер нормализуется, плохой номер — ошибка phone", () => {
    expect(parseCodeRequest(form({ phone: "8 700 000 00 01" }))).toEqual({ ok: true, data: { phone: "+77000000001" } });
    expect(parseCodeRequest(form({ phone: "123" }))).toEqual({ ok: false, error: "phone" });
  });

  it("код с пробелами принимается, иначе ошибка code", () => {
    expect(parseCodeVerify(form({ phone: "+77000000001", code: "123 456" }))).toEqual({
      ok: true,
      data: { phone: "+77000000001", code: "123456", profile: null },
    });
    expect(parseCodeVerify(form({ phone: "+77000000001", code: "12345" }))).toEqual({ ok: false, error: "code" });
  });

  it("первый вход: имя и Согласие обязательны", () => {
    const base = { phone: "+77000000001", code: "123456" };
    expect(parseCodeVerify(form({ ...base, name: "", consent: "on" }))).toEqual({ ok: false, error: "name" });
    expect(parseCodeVerify(form({ ...base, name: "Айгерим" }))).toEqual({ ok: false, error: "consent" });
    expect(parseCodeVerify(form({ ...base, name: "А".repeat(61), consent: "on" }))).toEqual({ ok: false, error: "nameLong" });
    expect(parseCodeVerify(form({ ...base, name: " Айгерим ", consent: "on" }))).toEqual({
      ok: true,
      data: { ...base, profile: { name: "Айгерим", consent: true } },
    });
  });

  it("профиль: имя обязательно", () => {
    expect(parseProfile(form({ name: "Дана" }))).toEqual({ ok: true, data: { name: "Дана" } });
    expect(parseProfile(form({ name: " " }))).toEqual({ ok: false, error: "name" });
  });
});
