// Логотипы — файлы из public/ (512×512): next/image берёт их уменьшенные копии из public/_img
// (src/lib/image-loader.ts). Номер версии в адресе меняем при замене файла — иначе браузер покажет старый.
export const logo = { src: "/logo.png?v=2", width: 512, height: 512 } as const;
export const logoWomen = { src: "/logo-women.png?v=1", width: 512, height: 512 } as const;

/** Логотип целиком (512 px) — для разметки зала в JSON-LD; номер версии меняем при замене файла. */
export const logoIconUrl = "/logo.png?v=2";

/**
 * Иконки вкладки и рабочего стола — маленькие копии логотипа (public/icon-32.png, icon-192.png, apple-icon-180.png):
 * полный logo.png весит 34 КБ, и браузер качал его при каждой загрузке страницы. При замене логотипа пересобрать
 * все три и поднять номер версии.
 */
export const siteIcons = { small: "/icon-32.png?v=1", large: "/icon-192.png?v=1", apple: "/apple-icon-180.png?v=1" } as const;
