// Юридические страницы: Политика конфиденциальности и Пользовательское соглашение.
// Тексты — данные (privacy.ts, terms.ts); реквизиты, адрес зала и телефон приходят из Настроек сайта.

import type { Dictionary } from "@/dictionaries/ru";
import type { Locale } from "@/lib/i18n";
import type { SiteContent } from "@/lib/domain/site-settings";
import { site } from "@/lib/site";
import type { LegalPageId } from "./meta";
import { privacyDoc } from "./privacy";
import { termsDoc } from "./terms";
import type { Inline, LegalContext, LegalDoc } from "./types";

export * from "./meta";
export type { Inline, LegalBlock, LegalContext, LegalDoc, LegalSection } from "./types";

export function legalContext(locale: Locale, t: Pick<Dictionary, "contacts">, s: Pick<SiteContent, "legal" | "contacts">): LegalContext {
  return { locale, siteName: site.name, city: t.contacts.city, legal: s.legal, contacts: s.contacts };
}

export function legalDoc(page: LegalPageId, c: LegalContext): LegalDoc {
  return page === "privacy" ? privacyDoc(c) : termsDoc(c);
}

/** Заголовок и описание страницы для поисковиков: от Настроек сайта они не зависят. */
export function legalHead(page: LegalPageId, locale: Locale): { title: string; description: string } {
  const doc = legalDoc(page, {
    locale,
    siteName: site.name,
    city: "",
    legal: { name: "", bin: "", address: "", email: "", dataLocation: "" },
    contacts: { address: "", phoneTel: "", phoneDisplay: "" },
  });
  return { title: `${doc.title} — ${site.name}`, description: doc.description };
}

/** Дата редакции на языке страницы: «11 октября 2026 г.» */
export function formatLegalDate(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00.000Z`),
  );
}

const inlineText = (parts: Inline[]) => parts.map((part) => (typeof part === "string" ? part : part.text)).join("");

/** Документ простым текстом — чтобы показать юристу и чтобы тесты читали его целиком. */
export function legalDocText(doc: LegalDoc, updatedLabel: string): string {
  const lines = [doc.title, updatedLabel, "", inlineText(doc.intro)];
  doc.sections.forEach((section, i) => {
    lines.push("", `${i + 1}. ${section.title}`);
    for (const block of section.blocks) {
      if ("p" in block) lines.push(inlineText(block.p));
      else for (const item of block.ul) lines.push(`— ${inlineText(item)}`);
    }
  });
  return lines.join("\n");
}
