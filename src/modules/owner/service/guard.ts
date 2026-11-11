import "server-only";
import { redirect } from "next/navigation";
import { currentRole, isAuthed } from "./session-cookie";

/**
 * Граница доступа к данным админки: вызывается в каждом серверном действии
 * и перед каждым чтением данных для страниц админки.
 * Middleware и layout — только первая линия и удобство, не защита.
 */
export async function requireOwner(): Promise<void> {
  if (!(await isAuthed())) redirect("/admin/login");
}

/**
 * Только Владелец, не Гость демо-админки (этап П1, ADR 0019): загрузка и удаление Фото, «Аккаунт», удаление
 * сущностей, отмена Записей, повтор уведомлений. Гость возвращается на главную админки с пометкой «В демо недоступно».
 */
export async function requireRealOwner(): Promise<void> {
  const role = await currentRole();
  if (role === null) redirect("/admin/login");
  if (role !== "owner") redirect("/admin?locked=1");
}
