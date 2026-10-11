"use client";

import Image from "next/image";
import { useState } from "react";
import { mapEmbedUrl, site } from "@/lib/site";
import { LocationOnSym, OpenInNewSym } from "@/components/symbols";
import { logo } from "@/lib/brand";

/**
 * Карта в «Контактах». Пока Посетитель не нажал «Показать карту», стоит заглушка с адресом: карту показывает
 * сторонний сервис (OpenStreetMap), и до нажатия сайт к нему не обращается — ни запросов, ни чужих cookie.
 * Размер блока один и тот же до и после нажатия: страница не сдвигается.
 */
export function MapPanel({
  labels,
  address,
  city,
  rating,
}: {
  labels: { show: string; open2gis: string; note: string; route: string; mapTitle: string };
  address: string;
  city: string;
  /** Оценка 2ГИС: «5,0» */
  rating: string;
}) {
  const [shown, setShown] = useState(false);
  const button = "flex h-12 items-center justify-center gap-1.5 rounded-xl px-6 text-[14px] uppercase transition-all";

  return (
    <div className="relative h-[320px] overflow-hidden rounded-2xl bg-surface-card shadow-lg md:h-[420px] lg:col-span-7">
      {shown ? (
        <>
          <iframe title={labels.mapTitle} src={mapEmbedUrl} className="absolute inset-0 h-full w-full [filter:brightness(0.75)]" />
          <div className="pointer-events-none absolute inset-0 bg-background/20" />
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3 rounded-xl bg-surface-card/95 p-4 shadow-xl backdrop-blur-md">
            <Image src={logo} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <div>
              <div className="text-[13px] uppercase leading-5 text-text-primary">{site.name}</div>
              <div className="text-[11px] leading-4 text-primary-container">
                {address} · 2ГИС ★ {rating}
              </div>
            </div>
          </div>
          <a
            href={site.twoGisRoute}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-8 right-4 flex items-center gap-1.5 rounded-xl bg-surface-dim/90 px-4 py-2 text-[11px] uppercase text-text-primary shadow-md backdrop-blur-xs transition-colors hover:text-primary-container"
          >
            <span>{labels.route}</span>
            <OpenInNewSym className="h-3.5 w-3.5" />
          </a>
        </>
      ) : (
        <div className="map-placeholder absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary-container">
            <LocationOnSym className="h-6 w-6" />
          </div>
          <div>
            <div className="text-headline-sm text-text-primary">{address}</div>
            <div className="mt-0.5 text-body-sm text-text-muted">
              {city} · 2ГИС ★ {rating}
            </div>
          </div>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <button type="button" onClick={() => setShown(true)} className={`${button} bg-primary-container font-bold text-on-primary shadow-md hover:brightness-95`}>
              {labels.show}
            </button>
            <a
              href={site.twoGis}
              target="_blank"
              rel="noopener noreferrer"
              className={`${button} bg-surface-container text-text-primary hover:text-primary-container`}
            >
              <span>{labels.open2gis}</span>
              <OpenInNewSym className="h-4 w-4" />
            </a>
          </div>
          <p className="text-[12px] leading-4 text-text-muted">{labels.note}</p>
        </div>
      )}
    </div>
  );
}
