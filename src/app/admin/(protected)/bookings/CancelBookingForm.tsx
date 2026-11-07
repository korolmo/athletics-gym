"use client";

import { cancelBookingByOwnerAction } from "./actions";

/** Отмена Записи Владельцем — с подтверждением: Окно освободится, Клиент увидит отмену в кабинете. */
export function CancelBookingForm({ id, back }: { id: string; back: string }) {
  return (
    <form
      action={cancelBookingByOwnerAction}
      onSubmit={(e) => {
        if (!window.confirm("Отменить запись? Клиент увидит отмену в кабинете.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className="rounded-lg bg-danger/15 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/25">
        Отменить запись
      </button>
    </form>
  );
}
