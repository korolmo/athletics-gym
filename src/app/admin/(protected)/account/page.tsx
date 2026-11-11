import { GUEST_LOCKED, getAccountLogin, isGuest } from "@/modules/owner";
import { UserIcon } from "@/components/icons";
import { CardTitle, Notice, PageHead, card } from "../../ui";
import { LogoutEverywhereButton, PasswordForm } from "./AccountForms";

// Аккаунт — по макету А10 (design/stitch/admin/a10-akkaunt-mobile.png): логин, смена пароля, «Выйти на всех устройствах».
// Списка сессий с устройствами, IP и «уровней прав» из макета нет: Владелец один, устройства сайт не запоминает.
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const { changed } = await searchParams;
  const [login, guest] = await Promise.all([getAccountLogin(), isGuest()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Аккаунт" subtitle="Вход Владельца в админку" />
      {guest && (
        <div className="mb-6">
          <Notice tone="error">{GUEST_LOCKED}: пароль и выход на всех устройствах меняет только Владелец.</Notice>
        </div>
      )}

      {changed && (
        <div className="mb-6">
          <Notice tone="ok">Пароль изменён. На других устройствах нужно войти заново.</Notice>
        </div>
      )}

      <section className={`${card} mb-5 flex items-center gap-4`}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <UserIcon className="h-7 w-7" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-accent">Владелец</span>
          <span className="block truncate text-xl font-bold">{login ?? "—"}</span>
          <span className="block text-sm text-muted">Логин — только для чтения</span>
        </span>
      </section>

      <section className="mb-5">
        <PasswordForm />
        <p className="mt-3 text-xs text-muted">
          После смены пароля все остальные устройства выйдут из админки. Забытый пароль восстанавливает разработчик.
        </p>
      </section>

      <section className={card}>
        <CardTitle title="Устройства" />
        <p className="mb-4 text-sm text-muted">Если админка осталась открытой на чужом телефоне или компьютере — выйдите везде сразу.</p>
        <LogoutEverywhereButton />
        <p className="mt-3 text-xs text-muted">Понадобится войти заново на этом и других устройствах.</p>
      </section>
    </div>
  );
}
