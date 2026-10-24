import { describe, expect, it } from "vitest";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";
import { notFoundLocale } from "./not-found-locale";

describe("язык страницы 404", () => {
  it("по адресу, если язык в нём есть", () => {
    expect(notFoundLocale("/kk/nope", `${LOCALE_COOKIE}=ru`)).toBe("kk");
    expect(notFoundLocale("/ru/a/b", `${LOCALE_COOKIE}=kk`)).toBe("ru");
  });

  it("без языка в адресе — по cookie, иначе русский", () => {
    expect(notFoundLocale("/abc", `theme=dark; ${LOCALE_COOKIE}=kk`)).toBe("kk");
    expect(notFoundLocale("/abc", `${LOCALE_COOKIE}=kk; other=1`)).toBe("kk");
    expect(notFoundLocale("/abc", "")).toBe("ru");
    expect(notFoundLocale("/abc", `${LOCALE_COOKIE}=en`)).toBe("ru");
    expect(notFoundLocale("/abc", `X${LOCALE_COOKIE}=kk`)).toBe("ru");
  });
});
