import { notFound } from "next/navigation";

// Неизвестный адрес в админке (/admin/abc) — 404 с шапкой и меню админки (not-found.tsx уровнем выше)
export default function UnknownAdminPage(): never {
  notFound();
}
