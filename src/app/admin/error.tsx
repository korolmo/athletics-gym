"use client";

import { AdminErrorCard } from "./ErrorCard";

// Упала сама рамка админки (шапка, меню, проверка входа) — та же карточка, но без шапки
export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-4 pt-6">
      <AdminErrorCard {...props} />
    </div>
  );
}
