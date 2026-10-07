"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTariff, type TariffFormState } from "./actions";
import {
  ACCESS,
  ACCESS_LABEL_RU,
  AUDIENCES,
  AUDIENCE_LABEL_RU,
  CATEGORY_FIELDS,
  CATEGORY_LABEL_RU,
  HALLS,
  HALL_LABEL_RU,
  HALL_CATEGORIES,
  type Access,
  type Audience,
  type Category,
  type HallId,
} from "@/lib/tariffs";

export type TariffInput = {
  id?: string;
  hallId: HallId;
  category: Category;
  titleRu: string;
  titleKk: string;
  visitsPerMonth: number | "";
  durationMonths: number | "";
  access: Access;
  audience: Audience;
  price: number | "";
  priceTo: number | "";
  isVisible: boolean;
};

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none transition placeholder:text-muted/60 focus:border-accent";
const labelCls = "mb-1.5 block text-sm text-muted";
const hint = "mt-1 block text-xs text-muted";

export function TariffForm({
  initial,
  trainer,
  cancelHref,
}: {
  initial: TariffInput;
  /** Задан — это персональный Тариф Тренера: Зал и Категория определены Тренером */
  trainer?: { id: string; name: string };
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState<TariffFormState, FormData>(saveTariff, undefined);
  const [category, setCategory] = useState<Category>(trainer ? "PERSONAL" : initial.category);
  // Показываем только поля, которые есть у выбранной Категории
  const fields = CATEGORY_FIELDS[category];
  const personal = category === "PERSONAL";

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      {trainer ? (
        <>
          <input type="hidden" name="trainerId" value={trainer.id} />
          <input type="hidden" name="hallId" value={initial.hallId} />
          <input type="hidden" name="category" value="PERSONAL" />
        </>
      ) : (
        <>
          <label className="block">
            <span className={labelCls}>Зал</span>
            <select name="hallId" defaultValue={initial.hallId} className={field}>
              {HALLS.map((h) => (
                <option key={h} value={h}>
                  {HALL_LABEL_RU[h]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelCls}>Категория</span>
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className={field}>
              {HALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL_RU[c]}
                </option>
              ))}
            </select>
            <span className={hint}>Персональные тренировки заводятся в карточке тренера.</span>
          </label>
        </>
      )}

      {fields.title && (
        <>
          <label className="block">
            <span className={labelCls}>Уточнение (RU)</span>
            <input name="titleRu" defaultValue={initial.titleRu} placeholder="1+1 (подходит для подруг)" className={field} />
            <span className={hint}>Необязательно. Если пусто — название соберётся из полей ниже.</span>
          </label>
          <label className="block">
            <span className={labelCls}>Нақтылау (KZ)</span>
            <input name="titleKk" defaultValue={initial.titleKk} className={field} />
            <span className={hint}>Если пусто — на казахской версии покажем русский.</span>
          </label>
        </>
      )}

      {fields.visits && (
        <label className="block">
          <span className={labelCls}>{personal ? "Тренировок в месяц" : "Посещений в месяц *"}</span>
          <input
            name="visitsPerMonth"
            type="number"
            min={1}
            inputMode="numeric"
            required={!personal}
            defaultValue={initial.visitsPerMonth}
            placeholder="12"
            className={field}
          />
          {personal && <span className={hint}>Пусто — разовая тренировка.</span>}
        </label>
      )}

      {fields.months && (
        <label className="block">
          <span className={labelCls}>Срок, месяцев *</span>
          <input
            name="durationMonths"
            type="number"
            min={1}
            inputMode="numeric"
            required
            defaultValue={initial.durationMonths}
            placeholder="1"
            className={field}
          />
          <span className={hint}>Безлимит — 1 вход в день.</span>
        </label>
      )}

      {fields.access && (
        <label className="block">
          <span className={labelCls}>Время доступа</span>
          <select name="access" defaultValue={initial.access} className={field}>
            {ACCESS.map((a) => (
              <option key={a} value={a}>
                {ACCESS_LABEL_RU[a]}
              </option>
            ))}
          </select>
        </label>
      )}

      {fields.audience && (
        <label className="block">
          <span className={labelCls}>Аудитория</span>
          <select name="audience" defaultValue={initial.audience} className={field}>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABEL_RU[a]}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={fields.priceTo ? "grid grid-cols-2 gap-3" : ""}>
        <label className="block">
          <span className={labelCls}>{fields.priceTo ? "Цена от, ₸ *" : "Цена, ₸ *"}</span>
          <input
            name="price"
            required
            inputMode="numeric"
            pattern="[0-9 ]*"
            defaultValue={initial.price}
            placeholder="12000"
            className={`${field} font-display text-3xl`}
          />
        </label>
        {fields.priceTo && (
          <label className="block">
            <span className={labelCls}>до, ₸</span>
            <input
              name="priceTo"
              inputMode="numeric"
              pattern="[0-9 ]*"
              defaultValue={initial.priceTo}
              placeholder="—"
              className={`${field} font-display text-3xl`}
            />
          </label>
        )}
      </div>
      {fields.priceTo && <span className={hint}>«до» заполняйте только для диапазона, например 15 000 – 25 000 ₸.</span>}

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
        <Link href={cancelHref} className="rounded-xl border border-line px-5 py-3.5 font-semibold text-muted">
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
