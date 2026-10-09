import { getAccountLogin } from "@/lib/services/account";
import { LogoutEverywhereButton, PasswordForm } from "./AccountForms";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const { changed } = await searchParams;
  const login = await getAccountLogin();

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Аккаунт</h1>
        {login && (
          <p className="mt-1 text-sm text-muted">
            Логин: <span className="text-fg">{login}</span>
          </p>
        )}
      </div>

      {changed && (
        <div role="status" className="mb-6 rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          Пароль изменён. На других устройствах нужно войти заново.
        </div>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Смена пароля</h2>
        <PasswordForm />
        <p className="mt-3 text-xs text-muted">
          После смены пароля все остальные устройства выйдут из админки. Забытый пароль восстанавливает разработчик.
        </p>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide">Устройства</h2>
        <p className="mb-4 text-sm text-muted">
          Если админка осталась открытой на чужом телефоне или компьютере — выйдите везде сразу.
        </p>
        <LogoutEverywhereButton />
      </section>
    </>
  );
}
