"use client";

import { useEffect } from "react";

/**
 * Движение на сайте, которому нужен скрипт: появление блоков при прокрутке, отсчёт рейтинга,
 * состояние шапки и нижней панели на телефоне. Сам код — в motion-run.ts и подгружается отдельным файлом,
 * когда браузер освободился после оживления страницы (requestIdleCallback): на загрузку и первую отрисовку он не влияет.
 * Сервер отдаёт страницу в готовом виде — без скрипта и при «меньше движения» всё видно сразу.
 *
 * Здесь же — точность якорей. Блоки ниже первого экрана браузер не раскладывает, пока они далеко (content-visibility
 * в globals.css), и их высота до тех пор — оценка. Перед переходом по ссылке с якорем ставим data-full-layout:
 * страница раскладывается целиком, и браузер прокручивает точно к блоку. Этот код не ждёт: ссылку могут нажать сразу.
 */
export function Motion() {
  useEffect(() => {
    const fullLayout = () => document.documentElement.setAttribute("data-full-layout", "");
    // Нажатие на ссылку с якорем: пометка ставится до того, как браузер начнёт прокрутку
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('a[href*="#"]')) fullLayout();
    };
    document.addEventListener("click", onClick, true);
    // Страницу открыли сразу с якорем (/ru#prices): браузер уже прокрутил по оценкам — ставим блок на место.
    // Браузер в это время ещё может плавно ехать к старому месту, а высоты — меняться (шрифты, картинки), поэтому
    // проверяем место после каждой остановки прокрутки, после загрузки страницы и шрифтов —
    // пока Посетитель сам не начал прокручивать
    let target: HTMLElement | null = null;
    try {
      target = window.location.hash.length > 1 ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
    } catch {
      // якорь с испорченным кодированием — оставляем как есть
    }
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const place = () => {
      if (!target) return;
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      if (Math.abs(target.getBoundingClientRect().top - margin) > 1) target.scrollIntoView({ behavior: "instant" });
    };
    const release = () => {
      target = null;
      inputs.forEach((type) => window.removeEventListener(type, release));
      window.removeEventListener("scrollend", place);
      window.removeEventListener("load", place);
      clearTimeout(later);
    };
    let later: ReturnType<typeof setTimeout> | undefined;
    if (target) {
      fullLayout();
      inputs.forEach((type) => window.addEventListener(type, release, { passive: true }));
      place();
      window.addEventListener("scrollend", place);
      window.addEventListener("load", place, { once: true });
      void document.fonts?.ready.then(place);
      // Safari не сообщает об остановке прокрутки — там ещё одна проверка чуть позже
      later = setTimeout(place, 800);
    }

    let stop: (() => void) | undefined;
    let cancelled = false;
    const load = () =>
      import("./motion-run").then(
        (m) => {
          if (!cancelled) stop = m.startMotion();
        },
        // Файл не загрузился — сайт остаётся неподвижным, панель на телефоне появится сама (bar-safety в globals.css)
        () => {},
      );
    // Safari не знает requestIdleCallback — там грузим сразу
    const idle = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(load, { timeout: 1500 }) : (load(), undefined);
    return () => {
      document.removeEventListener("click", onClick, true);
      release();
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      stop?.();
    };
  }, []);
  return null;
}
