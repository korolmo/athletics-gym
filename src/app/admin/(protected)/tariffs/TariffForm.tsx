"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveTariff, type TariffFormState } from "./actions";
import {
  CATEGORY_LABEL_RU,
  CATEGORY_ORDER,
  UNIT_LABEL_RU,
  UNITS,
  type Category,
  type Unit,
} from "@/lib/tariffs";

export type TariffInput = {
  id?: string;
  category: Category;
  nameRu: string;
  nameKk: string;
  descriptionRu: string;
  descriptionKk: string;
  price: number | "";
  durationValue: number;
  durationUnit: Unit;
  isVisible: boolean;
};

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none transition placeholder:text-muted/60 focus:border-accent";
const labelCls = "mb-1.5 block text-sm text-muted";

export function TariffForm({ initial }: { initial: TariffInput }) {
  const [state, action, pending] = useActionState<TariffFormState, FormData>(saveTariff, undefined);

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <label className="block">
        <span className={labelCls}>Категория</span>
        <select name="category" defaultValue={initial.category} className={field}>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL_RU[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelCls}>Название (RU) *</span>
        <input name="nameRu" required defaultValue={initial.nameRu} placeholder="Месячный безлимит" className={field} />
      </label>

      <label className="block">
        <span className={labelCls}>Атауы (KZ)</span>
        <input name="nameKk" defaultValue={initial.nameKk} placeholder="Айлық шексіз" className={field} />
        <span className="mt-1 block text-xs text-muted">Если пусто — на казахской версии покажем русский.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Цена, ₸ *</span>
        <input
          name="price"
          required
          inputMode="numeric"
          pattern="[0-9 ]*"
          defaultValue={initial.price}
          placeholder="9000"
          className={`${field} font-display text-3xl`}
        />
      </label>

      <div className="grid grid-cols-[1fr_1.4fr] gap-3">
        <label className="block">
          <span className={labelCls}>Срок *</span>
          <input
            name="durationValue"
            required
            type="number"
            min={1}
            inputMode="numeric"
            defaultValue={initial.durationValue}
            className={field}
          />
        </label>
        <label className="block">
          <span className={labelCls}>&nbsp;</span>
          <select name="durationUnit" defaultValue={initial.durationUnit} className={field}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL_RU[u]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Описание (RU)</span>
        <textarea name="descriptionRu" rows={3} defaultValue={initial.descriptionRu} className={field} />
      </label>

      <label className="block">
        <span className={labelCls}>Сипаттама (KZ)</span>
        <textarea name="descriptionKk" rows={3} defaultValue={initial.descriptionKk} className={field} />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-xl bg-card px-4 py-3.5">
        <span>Показывать на сайте</span>
        <input name="isVisible" type="checkbox" defaultChecked={initial.isVisible} className="h-6 w-6 accent-[#f5e642]" />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <Link href="/admin/tariffs" className="rounded-xl border border-line px-5 py-3.5 font-semibold text-muted">
          Отмена
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-accent py-3.5 font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
