"use client";

import { useEffect } from "react";

/**
 * Движение на сайте, которому нужен скрипт: появление блоков при прокрутке, отсчёт рейтинга,
 * состояние шапки и нижней панели на телефоне. Сам код — в motion-run.ts и подгружается отдельным файлом
 * после оживления страницы: на загрузку и первую отрисовку он не влияет.
 * Сервер отдаёт страницу в готовом виде — без скрипта и при «меньше движения» всё видно сразу.
 */
export function Motion() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("./motion-run").then(
      (m) => {
        if (!cancelled) stop = m.startMotion();
      },
      // Файл не загрузился — сайт остаётся неподвижным, панель на телефоне появится сама (bar-safety в globals.css)
      () => {},
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
