import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { errorsKk } from "@/dictionaries/errors/kk";
import { errorsRu } from "@/dictionaries/errors/ru";
import { DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";
import { OFFLINE_FILE, offlineBody, offlinePage } from "./offline-page";

describe("статическая страница 503", () => {
  it("файл в public/ собран из текущих словарей (иначе — npm run errors:build)", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "public", OFFLINE_FILE), "utf8").replace(/\r\n/g, "\n");
    expect(file).toBe(offlinePage());
  });

  it("тексты на обоих языках, без скриптов и сторонних ресурсов, кроме ссылки на 2ГИС", () => {
    const html = offlinePage();
    for (const text of [errorsRu.offline.heading, errorsRu.offline.text, errorsKk.offline.heading, errorsKk.offline.text]) {
      expect(html).toContain(text);
    }
    expect(html).not.toMatch(/<script|<link|@import|url\(/i);
    expect(html.match(/src="([^"]+)"/g)).toEqual(['src="/logo.png?v=2"']);
  });

  it("номера зала в файле нет — он в Настройках сайта", () => {
    const html = offlinePage();
    expect(html).not.toContain(DEFAULT_SETTINGS.whatsapp);
    expect(html).not.toContain(DEFAULT_SETTINGS.phone);
  });

  it("технические работы — свой заголовок на обоих языках, маркер 503", () => {
    const html = offlinePage("maintenance");
    for (const text of [errorsRu.maintenance.heading, errorsRu.maintenance.text, errorsKk.maintenance.heading, errorsKk.maintenance.text]) {
      expect(html).toContain(text);
    }
    expect(html).toContain(`<title>${errorsRu.maintenance.heading}`);
    expect(html).toContain('data-error-page="503"');
    expect(html).not.toContain(errorsRu.offline.heading);
  });

  it("код в странице — тот, что передали", () => {
    expect(offlineBody(500)).toContain(">500<");
    expect(offlineBody(503)).toContain(">503<");
  });
});
