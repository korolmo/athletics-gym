import type { MetadataRoute } from "next";
import { buildSitemap, readSeoEnv } from "@/lib/seo";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal/meta";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  // У юридических страниц дата изменения — дата редакции документа
  const legal = LEGAL_PAGES.map((page) => ({ path: `/${page}`, lastModified: new Date(`${LEGAL_UPDATED[page]}T00:00:00.000Z`) }));
  return buildSitemap(readSeoEnv().siteUrl, new Date(), legal);
}
