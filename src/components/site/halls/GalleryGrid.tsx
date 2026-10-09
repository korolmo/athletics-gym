"use client";

import Image from "next/image";
import { useState } from "react";
import { GALLERY_FIRST } from "@/lib/domain/photo";
import { label } from "@/components/ui/styles";

export type GalleryView = { id: string; url: string; caption: string | null };

/** Фото Галереи: первые несколько видны сразу, остальные открывает кнопка «Ещё». */
export function GalleryGrid({ photos, more }: { photos: GalleryView[]; more: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? photos : photos.slice(0, GALLERY_FIRST);
  const hidden = photos.length - shown.length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {shown.map((photo) => (
          <figure key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-card">
            <Image
              src={photo.url}
              alt={photo.caption ?? ""}
              fill
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {photo.caption && (
              <>
                <div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent" />
                <figcaption className={`${label} absolute inset-x-3 bottom-3 text-text-primary [overflow-wrap:anywhere]`}>
                  {photo.caption}
                </figcaption>
              </>
            )}
          </figure>
        ))}
      </div>
      {hidden > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setAll(true)}
            className="flex h-12 items-center justify-center rounded-xl bg-surface-card px-6 text-[14px] uppercase text-text-primary shadow-xs transition-colors hover:text-primary-container"
          >
            {more} · {hidden}
          </button>
        </div>
      )}
    </>
  );
}
