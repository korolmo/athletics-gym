"use client";

import { useFormStatus } from "react-dom";
import { cancelBookingAction } from "@/app/[locale]/cabinet/actions";
import type { Locale } from "@/lib/i18n";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="px-1 py-2 text-body-lg text-[#ff6b6b] transition hover:text-[#ff8a80] disabled:opacity-60">
      {label}
    </button>
  );
}

/** «Отменить запись» с подтверждением: отмена освобождает время тренера, вернуть её нельзя. */
export function CancelBookingButton({ locale, bookingId, label, confirm }: { locale: Locale; bookingId: string; label: string; confirm: string }) {
  return (
    <form
      action={cancelBookingAction}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <Submit label={label} />
    </form>
  );
}
