// Движение на сайте, которому нужен скрипт. Подгружается отдельным файлом уже после оживления страницы (см. Motion.tsx).

/** Что появляется при прокрутке: карточки, заголовки секций, плитки Галереи, Отзывы, большие блоки. */
const REVEAL =
  "main [data-card], main section h2, #gallery figure, #gallery .group, #reviews article, #women > div > div, #contacts .grid > div, #reviews .rounded-2xl";

/**
 * Запускает появление блоков при прокрутке, отсчёт рейтинга, состояние шапки и нижней панели на телефоне.
 * Без библиотек: IntersectionObserver и стили из globals.css. Возвращает функцию, которая всё снимает.
 */
export function startMotion(): () => void {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups: (() => void)[] = [];
  const stop = () => cleanups.forEach((f) => f());
  root.setAttribute("data-motion", "");

  // Шапка: прозрачная только в самом верху страницы
  const header = document.querySelector("[data-site-header]");
  const onScroll = () => header?.toggleAttribute("data-top", window.scrollY <= 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener("scroll", onScroll));

  const canObserve = "IntersectionObserver" in window;

  // Нижняя панель на телефоне: выезжает, когда первый экран почти ушёл (его низ поднялся выше 40% экрана);
  // один раз «кивает» через 3 с
  const bar = document.querySelector('[data-contact-source="mobile-bar"]');
  const hero = document.getElementById("top");
  if (bar && (!hero || !canObserve)) bar.setAttribute("data-shown", "");
  if (bar && hero && canObserve) {
    let nodded = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        const shown = !entry.isIntersecting;
        bar.toggleAttribute("data-shown", shown);
        if (shown && !reduce && !nodded) {
          nodded = true;
          timer = setTimeout(() => bar.classList.add("bar-nod"), 3000);
        }
      },
      { rootMargin: "-40% 0px 0px 0px" },
    );
    io.observe(hero);
    cleanups.push(() => {
      io.disconnect();
      clearTimeout(timer);
    });
  }

  if (reduce || !canObserve) return stop;

  // Появление при прокрутке. Помечаем только то, что сейчас ниже экрана: видимое не мигает,
  // а карточки одного ряда (один и тот же верхний край) получают задержку по очереди.
  // Сначала все замеры, потом все пометки — иначе каждая пометка заставляла бы браузер пересчитывать страницу
  const rows = new Map<number, number>();
  const limit = window.innerHeight * 0.95;
  const below = [...document.querySelectorAll<HTMLElement>(REVEAL)]
    .map((el) => ({ el, top: el.getBoundingClientRect().top }))
    .filter((m) => m.top > limit);
  for (const { el, top } of below) {
    const row = Math.round(top + window.scrollY);
    const i = rows.get(row) ?? 0;
    rows.set(row, i + 1);
    el.style.setProperty("--reveal-i", String(Math.min(i, 6)));
    el.setAttribute("data-reveal", "");
  }
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        reveal.unobserve(el);
        el.setAttribute("data-reveal", "in");
        // Один раз: после появления пометки убираем — карточка снова обычная (наведение, смена Зала)
        setTimeout(() => {
          el.removeAttribute("data-reveal");
          el.style.removeProperty("--reveal-i");
        }, 1200);
      }
    },
    { rootMargin: "0px 0px -6% 0px" },
  );
  below.forEach(({ el }) => reveal.observe(el));
  cleanups.push(() => {
    reveal.disconnect();
    below.forEach(({ el }) => el.removeAttribute("data-reveal"));
  });

  // Рейтинг 2ГИС: число отсчитывается от нуля за секунду, когда попало в экран. Ширина закреплена — соседи не прыгают.
  // Текст меняется не чаще 20 раз в секунду: глазу этого хватает, а браузеру втрое меньше пересчётов
  const count = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        count.unobserve(el);
        const to = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimals ?? 0);
        const final = el.textContent ?? "";
        if (!Number.isFinite(to)) continue;
        el.style.display = "inline-block";
        el.style.minWidth = `${el.getBoundingClientRect().width}px`;
        const began = performance.now();
        let painted = 0;
        const frame = (now: number) => {
          const p = Math.min(1, (now - began) / 1000);
          if (p < 1 && now - painted < 50) {
            requestAnimationFrame(frame);
            return;
          }
          painted = now;
          const value = to * (1 - Math.pow(1 - p, 3));
          el.textContent = p < 1 ? (decimals ? value.toFixed(decimals).replace(".", ",") : String(Math.round(value))) : final;
          if (p < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }
    },
    { threshold: 0.6 },
  );
  document.querySelectorAll("[data-count]").forEach((el) => count.observe(el));
  cleanups.push(() => count.disconnect());

  return stop;
}
