"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTariff, type TariffFormState } from "./actions";
import {
  ACCESS,
  AUDIENCES,
  CATEGORY_FIELDS,
  HALLS,
  HALL_CATEGORIES,
  type Access,
  type Audience,
  type Category,
  type HallId,
} from "@/modules/tariffs/client";
import { ACCESS_LABEL_RU, AUDIENCE_LABEL_RU, CATEGORY_LABEL_RU, HALL_LABEL_RU } from "@/modules/tariffs/client";
import { LIMITS } from "@/lib/admin/limits";
import { CardTitle, Notice, btnDark, btnPrimary, card, field, hint, label, toggle } from "../../ui";

// Форма Тарифа — по макету А4 (design/stitch/admin/a4-tarif-forma-mobile.png): карточки «Основное», «Стоимость»,
// «Параметры и доступ», «Отображение на сайте». Поля и их имена — прежние; «Утренний» доступ и аудитория «Школьники»
// из макета не добавлены: таких Времени доступа и Аудитории у Тарифов нет (GLOSSARY).

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

/** Выбор плашками (Зал, Время доступа, Аудитория): обычные radio, выбранная — жёлтая. */
function Pills<T extends string>({ name, options, labels, defaultValue }: { name: string; options: readonly T[]; labels: Record<T, string>; defaultValue: T }) {
  return (
    <div className={`grid gap-2 ${options.length > 2 ? "grid-cols-2" : "grid-cols-2"}`}>
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type="radio" name={name} value={o} defaultChecked={o === defaultValue} className="peer sr-only" />
          <span className="flex h-12 items-center justify-center rounded-xl border border-line bg-bg px-3 text-center text-sm font-semibold text-muted transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            {labels[o]}
          </span>
        </label>
      ))}
    </div>
  );
}

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
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <section className={card}>
        <CardTitle title="Основное" />
        {trainer ? (
          <>
            <input type="hidden" name="trainerId" value={trainer.id} />
            <input type="hidden" name="hallId" value={initial.hallId} />
            <input type="hidden" name="category" value="PERSONAL" />
            <p className="mb-4 rounded-xl bg-bg px-4 py-3 text-sm text-muted">
              Персональная тренировка тренера <b className="text-fg">{trainer.name}</b> — Зал и Категория берутся у тренера.
            </p>
          </>
        ) : (
          <div className="space-y-5">
            <label className="block">
              <span className={label}>Категория тарифа</span>
              <select name="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className={field}>
                {HALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL_RU[c]}
                  </option>
                ))}
              </select>
              <span className={hint}>Персональные тренировки заводятся в карточке тренера.</span>
            </label>
            <div>
              <span className={label}>Зал</span>
              <Pills name="hallId" options={HALLS} labels={HALL_LABEL_RU} defaultValue={initial.hallId} />
            </div>
          </div>
        )}

        {fields.title && (
          <div className="mt-5 space-y-5">
            <label className="block">
              <span className={`${label} flex justify-between`}>
                Уточнение (RU) <span className="text-xs uppercase tracking-wide">необязательно</span>
              </span>
              <input name="titleRu" maxLength={LIMITS.title} defaultValue={initial.titleRu} placeholder="1+1 (подходит для подруг)" className={field} />
              <span className={hint}>Если пусто — название соберётся из полей ниже.</span>
            </label>
            <label className="block">
              <span className={`${label} flex justify-between`}>
                Нақтылау (KZ) <span className="text-xs uppercase tracking-wide">необязательно</span>
              </span>
              <input name="titleKk" maxLength={LIMITS.title} defaultValue={initial.titleKk} className={field} />
              <span className={hint}>Если пусто — на казахской версии покажем русский.</span>
            </label>
          </div>
        )}
      </section>

      <section className={card}>
        <CardTitle title="Стоимость" />
        <div className={fields.priceTo ? "grid grid-cols-2 gap-3" : ""}>
          <label className="block">
            <span className={label}>{fields.priceTo ? "Цена от, ₸ *" : "Цена, ₸ *"}</span>
            <input
              name="price"
              required
              maxLength={12}
              inputMode="numeric"
              pattern="[0-9 ]*"
              defaultValue={initial.price}
              placeholder="12000"
              className={`${field} h-16 text-3xl font-extrabold text-accent`}
            />
          </label>
          {fields.priceTo && (
            <label className="block">
              <span className={label}>до, ₸</span>
              <input name="priceTo" maxLength={12} inputMode="numeric" pattern="[0-9 ]*" defaultValue={initial.priceTo} placeholder="—" className={`${field} h-16 text-3xl font-extrabold`} />
            </label>
          )}
        </div>
        {fields.priceTo && <span className={hint}>«до» — только для диапазона, например 15 000 – 25 000 ₸.</span>}
      </section>

      {(fields.visits || fields.months || fields.access || fields.audience) && (
        <section className={card}>
          <CardTitle title="Параметры и доступ" />
          <div className="space-y-5">
            {fields.visits && (
              <label className="block">
                <span className={label}>{personal ? "Тренировок в месяц" : "Посещений в месяц *"}</span>
                <input
                  name="visitsPerMonth"
                  type="number"
                  min={1}
                  max={LIMITS.visitsPerMonth}
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
                <span className={label}>Срок, месяцев *</span>
                <input
                  name="durationMonths"
                  type="number"
                  min={1}
                  max={LIMITS.durationMonths}
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
              <div>
                <span className={label}>Время доступа</span>
                <Pills name="access" options={ACCESS} labels={ACCESS_LABEL_RU} defaultValue={initial.access} />
              </div>
            )}
            {fields.audience && (
              <div>
                <span className={label}>Аудитория</span>
                <Pills name="audience" options={AUDIENCES} labels={AUDIENCE_LABEL_RU} defaultValue={initial.audience} />
              </div>
            )}
          </div>
        </section>
      )}

      <section className={card}>
        <CardTitle title="Отображение на сайте" />
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-bg px-4 py-4">
          <span>
            <span className="block font-semibold">Показывать на сайте</span>
            <span className="text-sm text-muted">Тариф виден посетителям в блоке цен</span>
          </span>
          <input name="isVisible" type="checkbox" defaultChecked={initial.isVisible} className={toggle} />
        </label>
      </section>

      {state?.error && <Notice tone="error">{state.error}</Notice>}

      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-line bg-bg/95 p-3 lg:bottom-4">
        <Link href={cancelHref} className={btnDark}>
          Отмена
        </Link>
        <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
          {pending ? "Сохраняем…" : "Сохранить изменения"}
        </button>
      </div>
    </form>
  );
}
