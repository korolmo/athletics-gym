import type { Metadata } from "next";
import "./globals.css";
import { LabBanner } from "@/components/LabBanner";
import { NotFoundLanguage } from "@/components/site/errors/NotFoundLanguage";
import { NotFoundView } from "@/components/site/errors/NotFoundView";
import { siteIcons } from "@/lib/brand";
import { siteFontVars } from "@/lib/fonts";
import { getDictionary } from "@/lib/i18n";
import { isLab } from "@/lib/lab";

// Страница 404 для любого адреса без своего маршрута — на сайте и в Лаборатории одинаково (ADR 0013).
// Это global-not-found Next (флаг experimental.globalNotFound): у проекта два корневых layout, и его Next отдаёт
// со своим <html>, кодом 404 и готовым HTML. notFound() внутри страницы для этого не годится: тогда сервер отдаёт пустую
// оболочку, а текст рисует браузер (так в Next 15.5 и 16.4 даже с одним корневым layout).
// Страница собирается при сборке, одна на все адреса: обе языковые версии в HTML, нужную выбирает браузер.

const ru = getDictionary("ru");
const kk = getDictionary("kk");

export const metadata: Metadata = {
  title: ru.errors.notFound.title,
  robots: { index: false, follow: false },
  icons: { icon: siteIcons.small },
};

export default function GlobalNotFound() {
  const demo = isLab();
  return (
    <html lang="ru" className={siteFontVars} data-lab={demo ? "" : undefined}>
      <body className="bg-background font-site text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
        {demo && <LabBanner texts={ru.lab} path="/ru" />}
        <NotFoundLanguage
          titles={{ ru: ru.errors.notFound.title, kk: kk.errors.notFound.title }}
          ru={<NotFoundView locale="ru" />}
          kk={<NotFoundView locale="kk" />}
        />
      </body>
    </html>
  );
}
