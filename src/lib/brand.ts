// Логотипы подключаются как модули: в адресе картинки появляется хэш содержимого,
// поэтому после замены файла ни оптимизатор картинок, ни браузер не покажут старую версию.
import logo from "../../public/logo.png";
import logoWomen from "../../public/logo-women.png";

export { logo, logoWomen };

/** Логотип целиком (512 px) — для разметки зала в JSON-LD; номер версии меняем при замене файла. */
export const logoIconUrl = "/logo.png?v=2";

/**
 * Иконки вкладки и рабочего стола — маленькие копии логотипа (public/icon-32.png, icon-192.png, apple-icon-180.png):
 * полный logo.png весит 34 КБ, и браузер качал его при каждой загрузке страницы. При замене логотипа пересобрать
 * все три и поднять номер версии.
 */
export const siteIcons = { small: "/icon-32.png?v=1", large: "/icon-192.png?v=1", apple: "/apple-icon-180.png?v=1" } as const;
