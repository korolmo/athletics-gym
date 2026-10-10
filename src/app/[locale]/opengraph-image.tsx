import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { getSiteSettings } from "@/lib/services/site";
import { toSiteContent } from "@/lib/domain/site-settings";
import { DEFAULT_ABOUT_CARDS, DEFAULT_SETTINGS } from "@/lib/domain/site-settings.defaults";

// Картинка-превью для ссылок (Open Graph, Twitter, WhatsApp, Telegram): 1200×630, своя для /ru и /kk.
// Логотип, название, город и адрес; адрес — из Настроек сайта.

export const alt = "Athletic's Gym";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Адрес меняет Владелец — картинку собираем по запросу, а не при сборке
export const dynamic = "force-dynamic";

// Эти файлы должны попасть в серверную функцию: список — outputFileTracingIncludes в next.config.mjs.
// Добавили сюда файл — добавьте его и туда, иначе на Vercel маршрут ответит ошибкой, хотя локально всё работает.
const asset = (path: string) => readFile(join(process.cwd(), path));

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> | { locale: string } }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "ru";
  const t = getDictionary(locale);
  // База недоступна — рисуем с начальным адресом: превью ссылки не должно ломаться
  const { settings, cards } = await getSiteSettings().catch(() => ({ settings: DEFAULT_SETTINGS, cards: DEFAULT_ABOUT_CARDS }));
  const s = toSiteContent(locale, settings, cards);

  const [logo, bold, medium] = await Promise.all([
    asset("public/logo.png"),
    asset("src/assets/fonts/Manrope-ExtraBold.ttf"),
    asset("src/assets/fonts/Manrope-Medium.ttf"),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 84px",
          background: "linear-gradient(120deg, #131315 0%, #1f1f23 60%, #2a2a1c 100%)",
          color: "#f4f4f5",
          fontFamily: "Manrope",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og рисует картинку сам, компонент Image здесь не работает */}
        <img src={logoSrc} alt="" width={300} height={300} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 4, color: "#f5e642" }}>{t.seo.kicker}</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 14 }}>ATHLETIC&apos;S GYM</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, marginTop: 18 }}>{t.seo.tagline}</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 500, marginTop: 30, color: "#a1a1aa", maxWidth: 640 }}>
            {t.contacts.city} · {s.contacts.address}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Manrope", data: bold, weight: 800, style: "normal" },
        { name: "Manrope", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
