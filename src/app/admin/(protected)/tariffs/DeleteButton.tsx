"use client";

import { deleteTariff } from "./actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteTariff}
      onSubmit={(e) => {
        if (!window.confirm(`Удалить тариф «${name}»? Он пропадёт с сайта.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="w-full rounded-xl py-3 text-sm font-semibold text-danger hover:bg-danger/10">
        Удалить тариф
      </button>
    </form>
  );
}
