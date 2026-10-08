const isDev = process.env.NODE_ENV !== "production";
// На превью Vercel подключает свою панель комментариев (vercel.live)
const isPreview = process.env.VERCEL_ENV === "preview";

// Content-Security-Policy: свои ресурсы + карта OpenStreetMap в iframe.
// Шрифты next/font и картинки next/image отдаются с нашего же домена.
// 'unsafe-inline' для script/style нужен самому Next (встроенные скрипты гидрации и стили);
// от встраивания чужих скриптов защищает запрет внешних источников.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${isPreview ? " https://vercel.live" : ""}`,
  `style-src 'self' 'unsafe-inline'${isPreview ? " https://vercel.live" : ""}`,
  `img-src 'self' data: blob:${isPreview ? " https://vercel.live https://vercel.com" : ""}`,
  `font-src 'self'${isPreview ? " https://vercel.live https://assets.vercel.com" : ""}`,
  `connect-src 'self'${isDev ? " ws: wss:" : ""}${isPreview ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
  `frame-src https://www.openstreetmap.org${isPreview ? " https://vercel.live" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
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
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
