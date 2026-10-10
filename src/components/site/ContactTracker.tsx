"use client";

import { useEffect } from "react";
import { CONTACT_SOURCES, channelOfHref, type ContactSource } from "@/lib/domain/contact";

/** Источник по месту ссылки на странице: явная пометка data-contact-source или секция, в которой она стоит. */
const SECTION_SOURCE: Record<string, ContactSource> = {
  top: "hero",
  directions: "directions",
  women: "women",
  prices: "prices",
  trainers: "trainer",
  reviews: "reviews",
  contacts: "contacts",
};

function sourceOf(link: Element): ContactSource | null {
  const marked = link.closest("[data-contact-source]")?.getAttribute("data-contact-source");
  if (marked && (CONTACT_SOURCES as readonly string[]).includes(marked)) return marked as ContactSource;
  const place = link.closest("section[id], header, footer");
  if (!place) return null;
  if (place.tagName === "HEADER") return "header";
  if (place.tagName === "FOOTER") return "footer";
  return SECTION_SOURCE[place.id] ?? null;
}

/**
 * Счётчик Обращений: слушает нажатия на ссылки WhatsApp, телефона и Instagram по всей странице
 * и сообщает о них серверу через sendBeacon. Переход по ссылке не задерживается и не отменяется:
 * если запись не удалась, Посетитель этого не заметит. Cookies не ставятся, сторонних сервисов нет.
 */
export function ContactTracker({ locale }: { locale: string }) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      try {
        const link = (event.target as Element | null)?.closest?.("a[href]");
        if (!link) return;
        const channel = channelOfHref(link.getAttribute("href") ?? "");
        const source = channel && sourceOf(link);
        if (!channel || !source) return;
        const body = new Blob([JSON.stringify({ channel, source, locale })], { type: "application/json" });
        navigator.sendBeacon?.("/api/contact", body);
      } catch {
        // счётчик не должен мешать переходу
      }
    };
    // Захват: считаем и нажатие колёсиком (auxclick), и обычное
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, [locale]);
  return null;
}
