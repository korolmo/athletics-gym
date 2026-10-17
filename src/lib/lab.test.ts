import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LAB_CONTACTS } from "../../prisma/seed-data";
import { LabBanner } from "@/components/LabBanner";
import { kk } from "@/dictionaries/kk";
import { ru } from "@/dictionaries/ru";
import { DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import { isInstagramUrl, isPhone, normalizeEmail, normalizeInstagram } from "@/lib/domain/site-settings";
import { CLIENT_SITE, isLab, labBannerText } from "./lab";

describe("Лаборатория: признак среды", () => {
  it("только APP_ENV=lab; боевой сайт, превью Vercel и локальный запуск — не Лаборатория", () => {
    expect(isLab({ APP_ENV: "lab" })).toBe(true);
    expect(isLab({ APP_ENV: " lab " })).toBe(true);
    for (const env of [{ APP_ENV: "production" }, { VERCEL_ENV: "preview" }, { APP_ENV: "twin" }, {}]) expect(isLab(env)).toBe(false);
  });
});

describe("плашка «демо-версия»", () => {
  it.each([
    ["ru", ru.lab, "Демо-версия платформы · боевой сайт клиента — athleticsgym.kz"],
    ["kk", kk.lab, "Платформаның демо-нұсқасы · клиенттің жұмыстағы сайты — athleticsgym.kz"],
  ])("%s: полный и короткий текст с адресом боевого сайта", (_, texts, full) => {
    expect(labBannerText(texts.full)).toBe(full);
    expect(labBannerText(texts.short)).toContain(CLIENT_SITE.host);
    const html = renderToStaticMarkup(createElement(LabBanner, { texts, path: "/ru" }));
    expect(html).toContain('role="note"');
    expect(html).toContain('href="https://athleticsgym.kz/ru"');
    expect(html).toContain(full);
  });
});

describe("контакты Лаборатории — вымышленные", () => {
  it("проходят правила формы Настроек сайта", () => {
    expect(isPhone(LAB_CONTACTS.phone)).toBe(true);
    expect(isPhone(`+${LAB_CONTACTS.whatsapp}`)).toBe(true);
    expect(isInstagramUrl(LAB_CONTACTS.instagram)).toBe(true);
    expect(normalizeInstagram(LAB_CONTACTS.womenInstagram)).toBe(LAB_CONTACTS.womenInstagram);
    expect(normalizeEmail(LAB_CONTACTS.privacyEmail)).toBe(LAB_CONTACTS.privacyEmail);
  });

  it("не совпадают с настоящими контактами зала и заведомо нерабочие", () => {
    expect(LAB_CONTACTS.phone).not.toBe(DEFAULT_SETTINGS.phone);
    expect(LAB_CONTACTS.whatsapp).not.toBe(DEFAULT_SETTINGS.whatsapp);
    expect(LAB_CONTACTS.instagram).not.toBe(DEFAULT_SETTINGS.instagram);
    expect(LAB_CONTACTS.phone).toBe("+77000000000");
    // Instagram не выдаёт имён с двумя точками подряд; example.com зарезервирован (RFC 2606)
    for (const url of [LAB_CONTACTS.instagram, LAB_CONTACTS.womenInstagram]) expect(url).toMatch(/\.\./);
    expect(LAB_CONTACTS.privacyEmail).toMatch(/@example\.com$/);
  });
});
