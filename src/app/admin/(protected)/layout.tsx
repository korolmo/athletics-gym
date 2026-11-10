import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAuthed } from "@/modules/owner";
import { AdminShell } from "./AdminShell";
import { getClubOnce, logosFor } from "@/app/brand";
import { DEFAULT_CLUB } from "@/modules/club/client";
import { countNewReviews } from "@/modules/reviews";
import { countDead } from "@/modules/notifications";
import { requireOwner } from "@/modules/owner";
import { kickOutbox } from "@/app/outbox-kick";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Только для интерфейса: сессию проверяют middleware и requireOwner() перед каждым чтением и записью данных
  if (!(await isAuthed())) redirect("/admin/login");
  kickOutbox();
  // Счётчик в меню — не повод ронять всю админку, если запрос не удался
  const [newReviews, undelivered, club] = await Promise.all([
    countNewReviews().catch(() => 0),
    countDead(requireOwner).catch(() => 0),
    getClubOnce().catch(() => DEFAULT_CLUB),
  ]);

  return (
    <AdminShell clubName={club.name} logo={logosFor(club).club} newReviews={newReviews} undelivered={undelivered}>
      {/* Suspense — ради страниц ошибок раздела. У проекта два корневых layout без общего, и Next 15 не может отрисовать
          notFound() или ошибку раздела на сервере: без границы падала вся оболочка (пустая страница и global-error).
          С ней шапка и меню отрисованы сервером, а not-found.tsx / error.tsx раздела показывает браузер. */}
      <Suspense>{children}</Suspense>
    </AdminShell>
  );
}
