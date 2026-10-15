"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { checkSource, checkUpload } from "@/lib/domain/photo";
import { compressPhotoSet } from "@/lib/photo/compress";
import { attachPhoto, discardUpload, requestUpload } from "./actions";

type Stage =
  | { step: "idle" }
  | { step: "working"; label: string; percent: number | null; preview: string | null; name: string }
  | { step: "done"; count: number };

const NETWORK = "Фото не загрузилось: проверьте связь и попробуйте ещё раз.";

/** Загрузка файла (PUT) по адресу от сервера, с ходом загрузки. Ошибку с текстом от сервера показываем как есть. */
function putFile(url: string, blob: Blob, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", blob.type);
    // Имя файла уникальное и не меняется — браузерам и CDN можно хранить его год
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = NETWORK;
      try {
        const body = JSON.parse(xhr.responseText) as { error?: unknown };
        if (typeof body.error === "string" && body.error) message = body.error;
      } catch {
        // ответ не JSON — общая ошибка
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error(NETWORK));
    xhr.send(blob);
  });
}

/**
 * Кнопка «выбрать фото»: сжимает в браузере (с уменьшенными копиями), загружает в хранилище и привязывает к месту на сайте.
 * `target` — куда: hero, women, gallery, trainer:<id>, hall:<зал>. Для Галереи можно выбрать сразу несколько фото.
 */
export function PhotoUploader({
  target,
  label,
  multiple = false,
  disabled = false,
}: {
  target: string;
  label: string;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ step: "idle" });
  const [errors, setErrors] = useState<string[]>([]);
  const preview = stage.step === "working" ? stage.preview : null;

  // Ссылку на превью освобождаем, когда она больше не показывается
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function uploadOne(file: File, position: string): Promise<void> {
    const working = (label: string, percent: number | null, shown: string | null) =>
      setStage({ step: "working", label: `${label}${position}`, percent, preview: shown, name: file.name });

    const source = checkSource(file.type, file.size);
    if (!source.ok) throw new Error(source.error);

    working("Сжимаем фото", null, null);
    const blobs = await compressPhotoSet(file);
    for (const blob of blobs) {
      const check = checkUpload(blob.type, blob.size);
      if (!check.ok) throw new Error(check.error);
    }
    const shown = URL.createObjectURL(blobs[0]);

    working("Готовим загрузку", null, shown);
    const ticket = await requestUpload(target, blobs[0].type, blobs.map((b) => b.size));
    if (!ticket.ok) throw new Error(ticket.error);

    try {
      // Ход загрузки — по всем файлам вместе: само Фото и его уменьшенные копии
      const total = blobs.reduce((sum, b) => sum + b.size, 0);
      let before = 0;
      working("Загружаем", 0, shown);
      for (const [i, upload] of ticket.uploads.entries()) {
        await putFile(upload.url, blobs[i], (loaded) => working("Загружаем", Math.round(((before + loaded) / total) * 100), shown));
        before += blobs[i].size;
      }
      working("Сохраняем", null, shown);
      const saved = await attachPhoto(target, ticket.path);
      if (!saved.ok) throw new Error(saved.error);
    } catch (e) {
      // Файлы могли успеть попасть в хранилище — без записи в базе они там не нужны
      await discardUpload(ticket.path).catch(() => {});
      throw e;
    }
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = [...files];
    const failed: string[] = [];
    let done = 0;
    setErrors([]);
    for (const [i, file] of list.entries()) {
      try {
        await uploadOne(file, list.length > 1 ? ` (${i + 1} из ${list.length})` : "");
        done++;
      } catch (e) {
        const message = e instanceof Error && e.message ? e.message : NETWORK;
        failed.push(list.length > 1 ? `${file.name}: ${message}` : message);
      }
    }
    if (input.current) input.current.value = "";
    setErrors(failed);
    setStage(done > 0 ? { step: "done", count: done } : { step: "idle" });
    if (done > 0) router.refresh();
  }

  const busy = stage.step === "working";

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        aria-disabled={busy || disabled}
        className={`flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-3 text-center font-semibold text-accent-ink transition hover:brightness-95 ${
          busy || disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {busy ? "Загружаем…" : label}
      </label>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={busy || disabled}
        onChange={(e) => onPick(e.target.files)}
        className="sr-only"
      />

      {stage.step === "working" && (
        <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-card p-3">
          {stage.preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- превью файла из памяти браузера, оптимизатору его не отдать
            <img src={stage.preview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-line" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm">
              {stage.label}
              {stage.percent !== null ? ` — ${stage.percent}%` : "…"}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full bg-accent transition-all ${stage.percent === null ? "w-1/3 animate-pulse" : ""}`}
                style={stage.percent !== null ? { width: `${stage.percent}%` } : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {stage.step === "done" && errors.length === 0 && (
        <p role="status" className="rounded-xl border border-wa/40 bg-wa/10 px-4 py-3 text-sm text-wa">
          {stage.count > 1 ? `Загружено фото: ${stage.count} — уже на сайте` : "Фото загружено — уже на сайте"}
        </p>
      )}

      {errors.length > 0 && (
        <div role="alert" className="space-y-1 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {stage.step === "done" && <p>Загружено: {stage.count}. Не загрузились:</p>}
          {errors.map((e) => (
            <p key={e} className="[overflow-wrap:anywhere]">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
