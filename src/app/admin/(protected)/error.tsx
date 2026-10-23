"use client";

import { AdminErrorCard } from "../ErrorCard";

// Ошибка в разделе админки — карточка внутри её шапки и меню
export default function AdminSectionError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminErrorCard {...props} />;
}
