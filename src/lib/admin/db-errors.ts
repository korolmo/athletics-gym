/** Prisma P2025: запись, которую правим или удаляем, не найдена. */
export function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2025";
}

export const NOT_FOUND_MESSAGE = "Запись не найдена — возможно, её уже удалили. Вернитесь к списку.";
