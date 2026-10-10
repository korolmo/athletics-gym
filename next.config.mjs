const isDev = process.env.NODE_ENV !== "production";
// На превью Vercel подключает свою панель комментариев (vercel.live)
const isPreview = process.env.VERCEL_ENV === "preview";

// Хранилище фото (Supabase Storage): адрес берётся из SUPABASE_URL при сборке.
// Если переменная не задана или это не https-адрес, хранилище просто не разрешается — сайт показывает картинки из public/.
function storageOrigin() {
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

// Превью и любые не-production деплои работают на базе разработки: в поиск они попадать не должны.
// Заголовок закрывает от индексации всё, включая картинки и файлы, у которых нет своего meta robots.
const isProductionDeploy = process.env.VERCEL_ENV === "production";

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    // next/image берёт из хранилища только публичные файлы бакета media
    remotePatterns: storage
      ? [{ protocol: "https", hostname: storage.hostname, pathname: "/storage/v1/object/public/media/**" }]
      : [],
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
