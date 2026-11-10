"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteTrainer, saveTrainer, type TrainerFormState } from "./actions";
import { HALLS, type HallId } from "@/modules/tariffs/client";
import { HALL_LABEL_RU } from "@/modules/tariffs/client";
import { LIMITS } from "@/lib/admin/limits";
import { CardTitle, Notice, btnDark, btnPrimary, card, field, hint, label, textarea, toggle } from "../../ui";

// Карточка «Основная информация» Тренера — по макету А5 (design/stitch/admin/a5-trener-forma-mobile.png).
// Поля и их имена — прежние; «Специализации» из макета нет — у Тренера только описание.

export type TrainerInput = {
  /** Пусто — новый Тренер */
  id?: string;
  name: string;
  hallId: HallId;
  descriptionRu: string;
  descriptionKk: string;
  sortOrder: number | "";
  isVisible: boolean;
};

export function TrainerForm({ initial }: { initial: TrainerInput }) {
  const [state, action, pending] = useActionState<TrainerFormState, FormData>(saveTrainer, undefined);

  return (
    <form action={action} className={`${card} space-y-5`}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <CardTitle title="Основная информация" />

      <label className="block">
        <span className={`${label} flex justify-between`}>
          Имя <span className="text-xs text-danger">* обязательно</span>
        </span>
        <input name="name" required maxLength={LIMITS.name} defaultValue={initial.name} placeholder="Например, Нұрмахан" className={field} />
      </label>

      <div>
        <span className={label}>Зал</span>
        <div className="grid grid-cols-2 gap-2">
          {HALLS.map((h) => (
            <label key={h} className="cursor-pointer">
              <input type="radio" name="hallId" value={h} defaultChecked={h === initial.hallId} className="peer sr-only" />
              <span className="flex h-12 items-center justify-center rounded-xl border border-line bg-bg font-semibold text-muted transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {HALL_LABEL_RU[h]}
              </span>
            </label>
          ))}
        </div>
        {initial.id && <span className={hint}>Тарифы тренера переедут в выбранный зал вместе с ним.</span>}
      </div>

      <label className="block">
        <span className={`${label} flex justify-between`}>
          Описание <span className="text-xs text-accent">RU</span>
        </span>
        <textarea name="descriptionRu" rows={4} maxLength={LIMITS.description} defaultValue={initial.descriptionRu} className={textarea} />
      </label>

      <label className="block">
        <span className={`${label} flex justify-between`}>
          Сипаттама <span className="text-xs text-accent">KZ</span>
        </span>
        <textarea name="descriptionKk" rows={4} maxLength={LIMITS.description} defaultValue={initial.descriptionKk} className={textarea} />
        <span className={hint}>Если пусто — на казахской версии покажем русский.</span>
      </label>

      <label className="flex items-center justify-between gap-4 rounded-xl bg-bg px-4 py-3">
        <span>
          <span className="block font-semibold">Порядок в списке</span>
          <span className="text-xs text-muted">Меньше число — выше в списке зала{initial.id ? "; пусто — не менять" : ""}</span>
        </span>
        <input
          name="sortOrder"
          type="number"
          min={0}
          max={LIMITS.sortOrder}
          inputMode="numeric"
          defaultValue={initial.sortOrder}
          placeholder={initial.id ? "—" : "в конец"}
          className="h-12 w-24 rounded-xl border border-line bg-card px-3 text-center text-lg font-bold outline-none focus:border-accent"
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-bg px-4 py-3">
        <span>
          <span className="block font-semibold">Показывать на сайте</span>
          <span className="text-xs text-muted">Карточка видна посетителям в блоке тренеров</span>
        </span>
        <input name="isVisible" type="checkbox" defaultChecked={initial.isVisible} className={toggle} />
      </label>

      {state?.error && <Notice tone="error">{state.error}</Notice>}

      <div className="flex gap-3">
        <Link href={`/admin/trainers?hall=${initial.hallId}`} className={btnDark}>
          {initial.id ? "К списку" : "Отмена"}
        </Link>
        <button type="submit" disabled={pending} className={`${btnPrimary} flex-1`}>
          {pending ? "Сохраняем…" : initial.id ? "Сохранить" : "Добавить тренера"}
        </button>
      </div>
    </form>
  );
}

export function DeleteTrainerButton({ id, name, tariffCount }: { id: string; name: string; tariffCount: number }) {
  return (
    <form
      action={deleteTrainer}
      onSubmit={(e) => {
        const tariffs = tariffCount > 0 ? ` Вместе с ним удалятся его тарифы (${tariffCount}).` : "";
        if (!window.confirm(`Удалить тренера «${name}»?${tariffs} Он пропадёт с сайта.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="w-full rounded-xl py-3 text-sm font-semibold text-danger hover:bg-danger/10">
        Удалить тренера
      </button>
    </form>
  );
}
