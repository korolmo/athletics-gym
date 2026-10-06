export const site = {
  name: "Athletic's Gym",
  phoneDisplay: "+7 771 484 63 44",
  phoneTel: "+77714846344",
  whatsappNumber: "77714846344",
  instagram: "https://instagram.com/athletics_gym_qyzylorda",
  instagramWomen: "https://instagram.com/athletics__gym__women",
  twoGis: "https://2gis.kz/kyzylorda/firm/70000001069365221",
  twoGisReviews: "https://2gis.kz/kyzylorda/firm/70000001069365221/tab/reviews",
  twoGisRoute:
    "https://2gis.kz/kyzylorda/directions/points/%7C65.512295%2C44.784253%3B70000001069365221",
  rating: "5,0",
  coords: { lat: 44.784253, lng: 65.512295 },
} as const;

export function whatsappUrl(text: string): string {
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export const mapEmbedUrl = (() => {
  const { lat, lng } = site.coords;
  const bbox = [lng - 0.008, lat - 0.004, lng + 0.008, lat + 0.004].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
})();
