import type { Metadata } from "next";
import "../globals.css";
import { fontVars } from "@/lib/admin-fonts";
import { siteIcons } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Админка — Athletic's Gym",
  robots: { index: false, follow: false },
  icons: { icon: siteIcons.small },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVars}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
