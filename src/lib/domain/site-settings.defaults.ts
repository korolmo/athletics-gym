// Начальные Настройки сайта — тексты, которые до этапа 1 лежали в словарях и в коде.
// Отсюда их берут seed и запасной вариант на случай пустой базы; на боевую базу те же значения
// кладёт миграция 20261009010000_site_settings (совпадение проверяет тест).

import type { AboutCardData, SiteSettingsData } from "./site-settings";

// Импорт только типов: сам site-settings.ts берёт отсюда запасные значения для ссылок.

export const DEFAULT_SETTINGS: SiteSettingsData = {
  heroTitleRu: "КҮШ. ШЫДАМДЫЛЫҚ. НӘТИЖЕ.",
  // Девиз зала — на казахском в обеих версиях сайта
  heroTitleKk: null,
  heroSubtitleRu: "Тренажёрный зал и функциональный тренинг в центре Кызылорды. Первое посещение — бесплатно.",
  heroSubtitleKk: "Қызылорданың орталығындағы тренажер залы және функционалдық тренинг. Алғашқы келу — тегін.",
  womenTextRu: "Отдельный тренажёрный зал только для женщин: свои тренажёры, свои тренеры и спокойная атмосфера.",
  womenTextKk:
    "Тек әйелдерге арналған бөлек тренажер залы: өз тренажерлары, өз жаттықтырушылары және жайлы атмосфера.",
  womenInstagram: "https://instagram.com/athletics__gym__women",
  addressRu: "ул. Султана Бейбарса, 2а, цокольный этаж",
  addressKk: "Сұлтан Бейбарыс көшесі, 2а, цоколь қабат",
  hoursRu: "Ежедневно 08:00–23:00",
  hoursKk: "Күн сайын 08:00–23:00",
  phone: "+77714846344",
  whatsapp: "77714846344",
  instagram: "https://instagram.com/athletics_gym_qyzylorda",
  ratingTenths: 50,
  ratingCount: 405,
  showAbout: true,
  showDirections: true,
  showWomen: true,
  showPrices: true,
  showGallery: true,
  showTrainers: true,
  showContacts: true,
};

export const DEFAULT_ABOUT_CARDS: AboutCardData[] = [
  {
    position: 1,
    kickerRu: "Оборудование",
    kickerKk: "Жабдық",
    titleRu: "Новые тренажёры",
    titleKk: "Жаңа тренажерлар",
    textRu: "Оборудование на все группы мышц",
    textKk: "Барлық бұлшық ет топтарына арналған жабдық",
  },
  {
    position: 2,
    kickerRu: "Приватность",
    kickerKk: "Оңашалық",
    titleRu: "Отдельный женский зал",
    titleKk: "Бөлек әйелдер залы",
    textRu: "Своё пространство только для женщин",
    textKk: "Тек әйелдерге арналған жеке кеңістік",
  },
  {
    position: 3,
    kickerRu: "Микроклимат",
    kickerKk: "Микроклимат",
    titleRu: "Кондиционеры",
    titleKk: "Кондиционерлер",
    textRu: "Прохладно даже летом",
    textKk: "Жазда да салқын",
  },
  {
    position: 4,
    kickerRu: "Режим",
    kickerKk: "Режим",
    titleRu: "08:00–23:00",
    titleKk: "08:00–23:00",
    textRu: "Ежедневно, до и после работы",
    textKk: "Күн сайын, жұмысқа дейін және кейін",
  },
];
