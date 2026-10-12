import Link from "next/link";
import { ContactTracker } from "@/components/site/ContactTracker";
import { Footer, Header } from "@/components/site/sections";
import type { SectionProps } from "@/components/site/sections/types";
import { container, eyebrow, h2, label } from "@/components/ui/styles";
import { LEGAL_PAGES, formatLegalDate, legalPath, type Inline, type LegalDoc, type LegalPageId } from "@/lib/legal";
import { site } from "@/lib/site";

const link = "text-primary-container underline underline-offset-2 transition-colors hover:text-text-primary";

function Text({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          part
        ) : (
          <a key={i} href={part.href} className={link}>
            {part.text}
          </a>
        ),
      )}
    </>
  );
}

/**
 * Юридическая страница: Политика конфиденциальности или Пользовательское соглашение.
 * Шапка и подвал — те же, что на главной (их ссылки ведут на главную); текст — колонкой читаемой ширины,
 * вверху дата редакции и оглавление. Движения и нижней панели на телефоне здесь нет.
 */
export function LegalPage({ locale, t, s, doc, page }: SectionProps & { doc: LegalDoc; page: LegalPageId }) {
  const home = `/${locale}`;
  const other = LEGAL_PAGES.filter((p) => p !== page);
  return (
    <>
      <ContactTracker locale={locale} />
      <Header locale={locale} t={t} s={s} home={home} path={`/${page}`} hasDirections={false} />
      <main className="w-full bg-background pt-16 md:pt-20">
        <article className={`${container} py-10`}>
          <div className="mx-auto max-w-[70ch]">
            <div className={eyebrow}>{site.name}</div>
            <h1 className={h2}>{doc.title}</h1>
            <p className="mt-2 text-body-sm text-text-muted">{t.legal.updated.replace("{date}", formatLegalDate(locale, doc.updated))}</p>
            <p className="mt-6 text-body-lg text-on-surface-variant">
              <Text parts={doc.intro} />
            </p>

            <nav aria-labelledby="legal-toc" className="mt-8 rounded-2xl bg-surface-card p-6 shadow-xs">
              <h2 id="legal-toc" className={`${label} tracking-wider text-text-muted`}>
                {t.legal.toc}
              </h2>
              <ol className="mt-3 flex flex-col gap-1">
                {doc.sections.map((section, i) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="flex min-h-9 items-center gap-2 text-body-md text-text-primary transition-colors hover:text-primary-container">
                      <span className="w-6 shrink-0 text-text-muted">{i + 1}.</span>
                      <span className="underline underline-offset-2">{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {doc.sections.map((section, i) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mt-10 scroll-mt-24">
                <h2 id={`${section.id}-title`} className="text-headline-md text-text-primary">
                  {i + 1}. {section.title}
                </h2>
                {section.blocks.map((block, j) =>
                  "p" in block ? (
                    <p key={j} className="mt-4 text-body-lg text-on-surface-variant">
                      <Text parts={block.p} />
                    </p>
                  ) : (
                    <ul key={j} className="mt-4 flex list-disc flex-col gap-2 pl-5 text-body-lg text-on-surface-variant marker:text-primary-container">
                      {block.ul.map((item, k) => (
                        <li key={k}>
                          <Text parts={item} />
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </section>
            ))}

            <div className={`${label} mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-surface-border pt-6 text-text-muted`}>
              <Link href={home} prefetch={false} className="transition-colors hover:text-primary-container">
                {t.legal.home}
              </Link>
              {other.map((p) => (
                <Link key={p} href={legalPath(locale, p)} prefetch={false} className="transition-colors hover:text-primary-container">
                  {t.footer[p]}
                </Link>
              ))}
            </div>
          </div>
        </article>
      </main>
      <Footer locale={locale} t={t} s={s} home={home} bar={false} />
    </>
  );
}
