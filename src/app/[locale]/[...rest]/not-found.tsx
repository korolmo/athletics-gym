import type { Metadata } from "next";
import { defaultLocale, getDictionary, isLocale } from "@/lib/i18n";

// Только заголовок вкладки страницы 404. Код 404 ставит middleware, и при нём Next берёт метаданные не у page.tsx,
// а у not-found.tsx того же сегмента (с параметрами маршрута). Сама страница — page.tsx рядом; notFound() маршрут
// не вызывает, поэтому этот компонент не отрисовывается.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).errors.notFound.title, robots: { index: false, follow: false } };
}

export default function NotFoundMetadata() {
  return null;
}
