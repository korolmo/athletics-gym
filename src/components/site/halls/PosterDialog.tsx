"use client";

import Image from "next/image";
import { useEffect } from "react";
import { CloseSym } from "@/components/symbols";

/** Плакат целиком поверх страницы; закрывается нажатием, крестиком и Escape. */
export function PosterDialog({
  src,
  title,
  closeLabel,
  onClose,
}: {
  src: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-background/90 p-3 backdrop-blur-md"
    >
      <Image
        src={src}
        alt={title}
        width={1200}
        height={1700}
        sizes="100vw"
        className="h-auto max-h-[94dvh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
      />
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-card text-text-primary shadow-lg hover:text-primary-container"
      >
        <CloseSym className="h-6 w-6" />
      </button>
    </div>
  );
}
