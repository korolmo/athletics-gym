import "server-only";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";

/**
 * Граница доступа к данным админки: вызывается в каждом серверном действии
 * и перед каждым чтением данных для страниц админки.
 * Middleware и layout — только первая линия и удобство, не защита.
 */
export async function requireOwner(): Promise<void> {
  if (!(await isAuthed())) redirect("/admin/login");
}
