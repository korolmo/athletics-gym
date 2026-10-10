import type { MetadataRoute } from "next";
import { buildSitemap, readSeoEnv } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(readSeoEnv().siteUrl, new Date());
}
