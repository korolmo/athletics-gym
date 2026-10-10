import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { logout } from "../actions";
import { AdminNav } from "./AdminNav";
import { logo } from "@/lib/brand";
import { countNewReviews } from "@/lib/services/reviews";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Только для интерфейса: сессию проверяют middleware и requireOwner() перед каждым чтением и записью данных
  if (!(await isAuthed())) redirect("/admin/login");
  // Счётчик в меню — не повод ронять всю админку, если запрос не удался
  const newReviews = await countNewReviews().catch(() => 0);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src={logo} alt="" width={32} height={32} className="rounded-full" />
            <span className="font-display text-lg uppercase tracking-wide">Админка</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <a href="/ru" target="_blank" className="rounded-lg px-3 py-1.5 text-muted hover:text-fg">
              Сайт ↗
            </a>
            <form action={logout}>
              <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-fg">
                Выйти
              </button>
            </form>
          </div>
        </div>
        <AdminNav newReviews={newReviews} />
      </header>
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">{children}</div>
    </div>
  );
}
