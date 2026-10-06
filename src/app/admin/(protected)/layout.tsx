import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { logout } from "../actions";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/admin/login");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/admin/tariffs" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
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
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          <Link href="/admin/tariffs" className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-accent-ink">
            Тарифы
          </Link>
          <span className="cursor-not-allowed rounded-lg px-3 py-1.5 text-muted/60" title="Следующий этап">
            Тренеры · скоро
          </span>
          <span className="cursor-not-allowed rounded-lg px-3 py-1.5 text-muted/60" title="Следующий этап">
            Расписание · скоро
          </span>
        </nav>
      </header>
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">{children}</div>
    </div>
  );
}
