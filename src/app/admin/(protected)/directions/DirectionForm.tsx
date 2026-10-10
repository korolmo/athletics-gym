"use client";

import Link from "next/link";
import { useActionState } from "react";
import { DIRECTION_ICONS, DIRECTION_LIMITS, type DirectionIcon } from "@/lib/domain/direction";
import { DIRECTION_ICON } from "@/components/site/direction-icons";
import { DIRECTION_ICON_LABEL_RU } from "@/lib/presentation/direction-labels";
import { deleteDirection, saveDirection, type DirectionFormState } from "./actions";

export type DirectionFormValues = {
  /** Пусто — новое Направление */
  id?: string;
  titleRu: string;
  titleKk: string;
  descriptionRu: string;
  descriptionKk: string;
  icon: DirectionIcon;
  isVisible: boolean;
};

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none transition placeholder:text-muted/60 focus:border-accent";
const labelCls = "mb-1.5 block text-sm text-muted";
const hint = "mt-1 block text-xs text-muted";

export function DirectionForm({ initial, hasPhoto = false }: { initial: DirectionFormValues; hasPhoto?: boolean }) {
  const [state, action, pending] = useActionState<DirectionFormState, FormData>(saveDirection, undefined);
  const typed = state?.values;
  const value = (name: "titleRu" | "titleKk" | "descriptionRu" | "descriptionKk" | "icon") => typed?.[name] ?? initial[name];
  const visible = typed ? typed.isVisible === "on" : initial.isVisible;

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <label className="block">
        <span className={labelCls}>Название (RU) *</span>
        <input name="titleRu" required maxLength={DIRECTION_LIMITS.title} defaultValue={value("titleRu")} placeholder="Например, Набор массы" className={field} />
      </label>
      <label className="block">
        <span className={labelCls}>Название (KZ)</span>
        <input name="titleKk" maxLength={DIRECTION_LIMITS.title} defaultValue={value("titleKk")} className={field} />
        <span className={hint}>Если пусто — на казахской версии покажем русское.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Короткое описание (RU)</span>
        <textarea name="descriptionRu" rows={3} maxLength={DIRECTION_LIMITS.description} defaultValue={value("descriptionRu")} className={field} />
        <span className={hint}>Необязательно, до {DIRECTION_LIMITS.description} символов. Одна-две фразы под названием.</span>
      </label>
      <label className="block">
        <span className={labelCls}>Короткое описание (KZ)</span>
        <textarea name="descriptionKk" rows={3} maxLength={DIRECTION_LIMITS.description} defaultValue={value("descriptionKk")} className={field} />
      </label>

      <fieldset>
        <legend className={labelCls}>Иконка</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {DIRECTION_ICONS.map((key) => {
            const Icon = DIRECTION_ICON[key];
            const label = DIRECTION_ICON_LABEL_RU[key];
            return (
              <label key={key} className="cursor-pointer">
                <input type="radio" name="icon" value={key} required defaultChecked={value("icon") === key} className="peer sr-only" />
                <span className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-card px-1 py-2.5 text-center text-xs text-muted peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  <Icon className="h-6 w-6" />
                  {label}
                </span>
              </label>
            );
          })}
        </div>
        <span className={hint}>
          {hasPhoto
            ? "Сейчас на сайте показывается ваше фото. Иконка вернётся, если фото удалить."
            : initial.id
              ? "Вместо иконки можно загрузить своё фото — ниже на этой странице."
              : "Своё фото вместо иконки можно загрузить сразу после добавления."}
        </span>
      </fieldset>

      <label className="flex items-center justify-between gap-4 rounded-xl bg-card px-4 py-3.5">
        <span>Показывать на сайте</span>
        <input name="isVisible" type="checkbox" defaultChecked={visible} className="h-6 w-6 accent-[#f5e642]" />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Link href="/admin/directions" className="rounded-xl border border-line px-5 py-3.5 font-semibold text-muted">
          {initial.id ? "К списку" : "Отмена"}
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-accent py-3.5 font-semibold text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : initial.id ? "Сохранить" : "Добавить направление"}
        </button>
      </div>
    </form>
  );
}

export function DeleteDirectionButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteDirection}
      onSubmit={(e) => {
        if (!window.confirm(`Удалить направление «${title}»? Оно пропадёт с сайта вместе со своим фото.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="w-full rounded-xl py-3 text-sm font-semibold text-danger hover:bg-danger/10">
        Удалить направление
      </button>
    </form>
  );
}
