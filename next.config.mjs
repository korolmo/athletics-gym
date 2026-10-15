const isDev = process.env.NODE_ENV !== "production";
// Среда — как в src/lib/seo.ts (resolveAppEnv): APP_ENV на hoster.kz, запасная — VERCEL_ENV
const appEnv = process.env.APP_ENV?.trim() || process.env.VERCEL_ENV?.trim() || undefined;
// На превью Vercel подключает свою панель комментариев (vercel.live)
const isPreview = process.env.VERCEL_ENV === "preview";

// Хранилище фото Supabase (STORAGE_DRIVER=supabase): адрес берётся из SUPABASE_URL при сборке.
// С диском хостинга (по умолчанию, ADR 0004) Фото отдаёт наш же сервер (/media/…), внешний адрес не нужен.
function storageOrigin() {
  if (process.env.STORAGE_DRIVER !== "supabase") return null;
  try {
    const url = new URL(process.env.SUPABASE_URL ?? "");
    // То же правило, что в src/lib/domain/photo.ts (storageOrigin)
    return url.protocol === "https:" && /^[a-z0-9.-]+$/.test(url.hostname) ? url : null;
  } catch {
    return null;
  }
}
const storage = storageOrigin();
const storageSrc = storage ? ` ${storage.origin}` : "";

// Content-Security-Policy: свои ресурсы + карта OpenStreetMap в iframe + хранилище фото.
// Шрифты next/font и картинки next/image отдаются с нашего же домена.
// 'unsafe-inline' для script/style нужен самому Next (встроенные скрипты гидрации и стили);
// от встраивания чужих скриптов защищает запрет внешних источников.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${isPreview ? " https://vercel.live" : ""}`,
  `style-src 'self' 'unsafe-inline'${isPreview ? " https://vercel.live" : ""}`,
  `img-src 'self' data: blob:${storageSrc}${isPreview ? " https://vercel.live https://vercel.com" : ""}`,
  `font-src 'self'${isPreview ? " https://vercel.live https://assets.vercel.com" : ""}`,
  `connect-src 'self'${storageSrc}${isDev ? " ws: wss:" : ""}${isPreview ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
  `frame-src https://www.openstreetmap.org${isPreview ? " https://vercel.live" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Всё, кроме production (проверочный запуск, превью, локальный сайт), в поиск попадать не должно.
// Заголовок закрывает от индексации всё, включая картинки и файлы, у которых нет своего meta robots.
// Заголовки вычисляются при сборке: ветку deploy для hoster.kz собирают с APP_ENV=production (.github/workflows/deploy.yml);
// robots.txt и meta robots главной читают APP_ENV уже на сервере, при запросе.
const isProductionDeploy = appEnv === "production";

const securityHeaders = [
  ...(isProductionDeploy ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
  { key: "Content-Security-Policy", value: csp },
  // Для старых браузеров, которые не понимают frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const OG_IMAGE_FILES = ["./src/assets/fonts/*.ttf", "./public/logo.png"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Хостинг hoster.kz (ADR 0004): готовый сервер (server.js) без node_modules, его запускает Passenger в Plesk
  output: "standalone",
  // 256 МБ на весь процесс: кэш страниц в памяти не держим, он лежит на диске (.next) и переживает перезапуск
  cacheMaxMemorySize: 0,
  // Картинка-превью ссылок читает шрифты и логотип с диска. Сборка Vercel кладёт в серверную функцию только те файлы,
  // которые нашла сама; эти она не находит — без явного списка маршрут отвечает ошибкой 500.
  outputFileTracingIncludes: {
    "/[locale]/opengraph-image": OG_IMAGE_FILES,
    "/[locale]/twitter-image": OG_IMAGE_FILES,
  },
  // Оптимизатора картинок на сервере нет (памяти мало, sharp на хостинг не ставим). Размеры готовят заранее:
  // для public/ — scripts/images/build-variants.mjs при сборке, для Фото — браузер Владельца при загрузке.
  // Загрузчик (src/lib/image-loader.ts) подставляет в srcset готовые файлы нужной ширины.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [400, 800, 1200, 1600],
    imageSizes: [64, 128, 256],
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
