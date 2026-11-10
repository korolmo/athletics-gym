import type { Metadata } from "next";
import "../globals.css";
import { fontVars } from "@/lib/admin-fonts";
import { getDictionary } from "@/lib/i18n";
import { isLab } from "@/lib/lab";
import { LabBanner } from "@/components/LabBanner";
import { accentStyle, getClubOnce, getLogos } from "@/app/brand";
import { DEFAULT_CLUB } from "@/modules/club/client";

export async function generateMetadata(): Promise<Metadata> {
  // Название — Клуба (этап П1); база недоступна — начальное, страница входа всё равно должна открыться
  const [club, logos] = await Promise.all([getClubOnce().catch(() => DEFAULT_CLUB), getLogos()]);
  return { title: `Админка — ${club.name}`, robots: { index: false, follow: false }, icons: { icon: logos.icons.small } };
}

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Админка в цвете Клуба — тот же акцент, что на сайте (этап П1)
  const accent = await accentStyle();
  return (
    <html lang="ru" className={fontVars} data-admin="" data-lab={isLab() ? "" : undefined} style={accent}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        {isLab() && <LabBanner texts={getDictionary("ru").lab} path="/ru" />}
        {children}
      </body>
    </html>
  );
}
