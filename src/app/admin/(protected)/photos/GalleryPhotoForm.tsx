"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LIMITS } from "@/lib/admin/limits";
import { deleteGalleryPhoto, saveGalleryCaption, type CaptionFormState } from "./actions";

const field =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-base outline-none transition placeholder:text-muted/70 focus:border-accent";
const labelCls = "mb-2 block text-sm font-semibold text-muted";
const hint = "mt-1 block text-xs text-muted";

export function GalleryPhotoForm({
  photo,
}: {
  photo: { id: string; captionRu: string | null; captionKk: string | null; isVisible: boolean };
}) {
  const [state, action, pending] = useActionState<CaptionFormState, FormData>(saveGalleryCaption, undefined);

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-line bg-card p-5 lg:p-6">
      <input type="hidden" name="id" value={photo.id} />

      <label className="block">
        <span className={labelCls}>Подпись (RU)</span>
        <input name="captionRu" maxLength={LIMITS.caption} defaultValue={photo.captionRu ?? ""} placeholder="Например, Кардиозона" className={field} />
        <span className={hint}>Необязательно: без подписи фото показывается просто так.</span>
      </label>

      <label className="block">
        <span className={labelCls}>Подпись (KZ)</span>
        <input name="captionKk" maxLength={LIMITS.caption} defaultValue={photo.captionKk ?? ""} className={field} />
        <span className={hint}>Если пусто — на казахской версии покажем русскую подпись.</span>
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-bg px-4 py-4 font-semibold">
        <span>Показывать на сайте</span>
        <input name="isVisible" type="checkbox" defaultChecked={photo.isVisible} className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-line transition before:absolute before:left-1 before:top-1 before:h-5 before:w-5 before:rounded-full before:bg-muted before:transition checked:bg-accent checked:before:translate-x-5 checked:before:bg-accent-ink" />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Link href="/admin/photos#gallery" className="inline-flex items-center rounded-xl bg-card-2 px-5 py-3.5 font-semibold text-fg hover:bg-line">
          К списку
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-xl bg-accent py-3.5 font-bold uppercase tracking-wide text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

export function DeleteGalleryPhotoButton({ id }: { id: string }) {
  return (
    <form
      action={deleteGalleryPhoto}
      onSubmit={(e) => {
        if (!window.confirm("Удалить фото из Галереи? Оно пропадёт с сайта, вернуть его нельзя.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="w-full rounded-xl py-3 text-sm font-semibold text-danger hover:bg-danger/10">
        Удалить фото
      </button>
    </form>
  );
}
