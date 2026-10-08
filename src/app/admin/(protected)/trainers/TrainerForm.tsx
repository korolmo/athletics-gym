"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteTrainer, saveTrainer, type TrainerFormState } from "./actions";
import { HALLS, type HallId } from "@/lib/domain/tariff";
import { HALL_LABEL_RU } from "@/lib/presentation/tariff-labels";
import { LIMITS } from "@/lib/admin/limits";

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

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none transition placeholder:text-muted/60 focus:border-accent";
const labelCls = "mb-1.5 block text-sm text-muted";
const hint = "mt-1 block text-xs text-muted";

export function TrainerForm({ initial }: { initial: TrainerInput }) {
  const [state, action, pending] = useActionState<TrainerFormState, FormData>(saveTrainer, undefined);

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <label className="block">
        <span className={labelCls}>Имя *</span>
        <input
          name="name"
          required
          maxLength={LIMITS.name}
          defaultValue={initial.name}
          placeholder="Например, Нұрмахан"
          className={field}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Зал</span>
        <select name="hallId" defaultValue={initial.hallId} className={field}>
          {HALLS.map((h) => (
            <option key={h} value={h}>
              {HALL_LABEL_RU[h]}
            </option>
          ))}
        </select>
        {initial.id && <span className={hint}>Тарифы тренера переедут в выбранный зал вместе с ним.</span>}
      </label>

      <label className="block">
        <span className={labelCls}>Описание (RU)</span>
        <textarea
          name="descriptionRu"
          rows={4}
          maxLength={LIMITS.description}
          defaultValue={initial.descriptionRu}
          className={field}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Сипаттама (KZ)</span>
        <textarea
          name="descriptionKk"
          rows={4}
          maxLength={LIMITS.description}
          defaultValue={initial.descriptionKk}
          className={field}
        />
        <span className={hint}>Если пусто — на казахской версии покажем русский.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Порядок на сайте</span>
        <input
          name="sortOrder"
          type="number"
          min={0}
          max={LIMITS.sortOrder}
          inputMode="numeric"
          defaultValue={initial.sortOrder}
          placeholder={initial.id ? "не менять" : "в конец списка"}
          className={field}
        />
        <span className={hint}>
          Меньше число — выше в списке своего зала.{initial.id ? " Пустое поле — порядок не меняется." : ""}
        </span>
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

      <div className="flex gap-3">
        <Link
          href={`/admin/trainers?hall=${initial.hallId}`}
          className="rounded-xl border border-line px-5 py-3.5 font-semibold text-muted"
        >
          {initial.id ? "К списку" : "Отмена"}
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-accent py-3.5 font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
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
