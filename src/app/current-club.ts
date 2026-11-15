import "server-only";
import { CLUB_ID } from "@/modules/club/client";

/**
 * Клуб запроса (этап П2, решение 10): сервисы получают его id первым аргументом, а узнаёт его слой приложения.
 * Пока адрес Клуб не выбирает (это PR 4 «Клуб в запросе»: middleware и заголовок x-club-id) — всегда Клуб по умолчанию.
 */
export async function currentClub(): Promise<string> {
  return CLUB_ID;
}
