// То, что Владелец не меняет: название, ссылки 2ГИС и точка на карте. Адрес сайта — в переменной SITE_URL (src/lib/seo.ts).
// Телефон, WhatsApp, Instagram, адрес, часы и рейтинг — в Настройках сайта (раздел «Сайт» админки).
export const site = {
  name: "Athletic's Gym",
  twoGis: "https://2gis.kz/kyzylorda/firm/70000001069365221",
  twoGisReviews: "https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews",
  twoGisRoute:
    "https://2gis.kz/kyzylorda/directions/points/%7C65.512295%2C44.784253%3B70000001069365221",
  coords: { lat: 44.784253, lng: 65.512295 },
} as const;

/** Ссылка-Обращение: WhatsApp зала (номер из Настроек сайта, только цифры) с готовым текстом. */
export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export const mapEmbedUrl = (() => {
  const { lat, lng } = site.coords;
  const bbox = [lng - 0.008, lat - 0.004, lng + 0.008, lat + 0.004].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
})();
