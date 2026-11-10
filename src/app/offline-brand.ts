import type { OfflineBrand } from "@/lib/errors/offline-page";
import { DEFAULT_CLUB } from "@/modules/club/client";

// Страницы 500 и 503 (ADR 0013) — без базы и без словаря сайта (их берёт и браузерная global-error.tsx): бренд —
// начальный Клуб, как адрес на 404 (решение 20 этапа П1).
export const OFFLINE_BRAND: OfflineBrand = { name: DEFAULT_CLUB.name, city: DEFAULT_CLUB.cityRu, twoGis: DEFAULT_CLUB.twoGisUrl ?? "" };
