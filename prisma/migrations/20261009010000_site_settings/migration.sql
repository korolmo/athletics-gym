-- Настройки сайта (одна запись, id = 'site') и четыре карточки «О зале».
-- Только добавление: старый код эти таблицы не читает и берёт тексты из словарей.

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "heroTitleRu" TEXT NOT NULL,
    "heroTitleKk" TEXT,
    "heroSubtitleRu" TEXT NOT NULL,
    "heroSubtitleKk" TEXT,
    "womenTextRu" TEXT NOT NULL,
    "womenTextKk" TEXT,
    "womenInstagram" TEXT NOT NULL,
    "addressRu" TEXT NOT NULL,
    "addressKk" TEXT,
    "hoursRu" TEXT NOT NULL,
    "hoursKk" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "ratingTenths" INTEGER NOT NULL,
    "ratingCount" INTEGER NOT NULL,
    "showHero" BOOLEAN NOT NULL DEFAULT true,
    "showAbout" BOOLEAN NOT NULL DEFAULT true,
    "showDirections" BOOLEAN NOT NULL DEFAULT true,
    "showWomen" BOOLEAN NOT NULL DEFAULT true,
    "showPrices" BOOLEAN NOT NULL DEFAULT true,
    "showGallery" BOOLEAN NOT NULL DEFAULT true,
    "showTrainers" BOOLEAN NOT NULL DEFAULT true,
    "showContacts" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutCard" (
    "position" INTEGER NOT NULL,
    "kickerRu" TEXT NOT NULL,
    "kickerKk" TEXT,
    "titleRu" TEXT NOT NULL,
    "titleKk" TEXT,
    "textRu" TEXT NOT NULL,
    "textKk" TEXT,

    CONSTRAINT "AboutCard_pkey" PRIMARY KEY ("position")
);

-- Начальные значения — тексты, которые до этапа 1 лежали в словарях и в коде
-- (src/lib/domain/site-settings.defaults.ts; совпадение проверяет тест). Все Блоки показаны.
INSERT INTO "SiteSettings" ("id", "heroTitleRu", "heroTitleKk", "heroSubtitleRu", "heroSubtitleKk", "womenTextRu", "womenTextKk", "womenInstagram", "addressRu", "addressKk", "hoursRu", "hoursKk", "phone", "whatsapp", "instagram", "ratingTenths", "ratingCount", "updatedAt")
VALUES (
    'site',
    'КҮШ. ШЫДАМДЫЛЫҚ. НӘТИЖЕ.',
    NULL,
    'Тренажёрный зал и функциональный тренинг в центре Кызылорды. Первое посещение — бесплатно.',
    'Қызылорданың орталығындағы тренажер залы және функционалдық тренинг. Алғашқы келу — тегін.',
    'Отдельный тренажёрный зал только для женщин: свои тренажёры, свои тренеры и спокойная атмосфера.',
    'Тек әйелдерге арналған бөлек тренажер залы: өз тренажерлары, өз жаттықтырушылары және жайлы атмосфера.',
    'https://instagram.com/athletics__gym__women',
    'ул. Султана Бейбарса, 2а, цокольный этаж',
    'Сұлтан Бейбарыс көшесі, 2а, цоколь қабат',
    'Ежедневно 08:00–23:00',
    'Күн сайын 08:00–23:00',
    '+77714846344',
    '77714846344',
    'https://instagram.com/athletics_gym_qyzylorda',
    50,
    405,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AboutCard" ("position", "kickerRu", "kickerKk", "titleRu", "titleKk", "textRu", "textKk")
VALUES
    (1, 'Оборудование', 'Жабдық', 'Новые тренажёры', 'Жаңа тренажерлар', 'Оборудование на все группы мышц', 'Барлық бұлшық ет топтарына арналған жабдық'),
    (2, 'Приватность', 'Оңашалық', 'Отдельный женский зал', 'Бөлек әйелдер залы', 'Своё пространство только для женщин', 'Тек әйелдерге арналған жеке кеңістік'),
    (3, 'Микроклимат', 'Микроклимат', 'Кондиционеры', 'Кондиционерлер', 'Прохладно даже летом', 'Жазда да салқын'),
    (4, 'Режим', 'Режим', '08:00–23:00', '08:00–23:00', 'Ежедневно, до и после работы', 'Күн сайын, жұмысқа дейін және кейін')
ON CONFLICT ("position") DO NOTHING;
