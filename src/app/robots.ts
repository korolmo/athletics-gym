import type { MetadataRoute } from "next";
import { buildRobots, readSeoEnv } from "@/lib/seo";

// Зависит от окружения деплоя (production или превью) — отдаём по запросу, а не из сборки
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(readSeoEnv());
}
