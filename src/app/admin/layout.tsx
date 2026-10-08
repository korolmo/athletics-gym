import type { Metadata } from "next";
import "../globals.css";
import { fontVars } from "@/lib/fonts";
import { logoIconUrl } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Админка — Athletic's Gym",
  robots: { index: false, follow: false },
  icons: { icon: logoIconUrl },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVars}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
