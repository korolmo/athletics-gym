import { AdminNotFoundCard } from "../ErrorCard";

// 404 внутри админки — с её шапкой и меню: неизвестный раздел ([...rest]) или notFound() у удалённой записи
export default function AdminNotFound() {
  return <AdminNotFoundCard />;
}
