# Бриф дизайна для Stitch — Athletic's Gym (питч)

## Что делаем в Stitch

5 экранов, все в одном проекте Stitch:

1. Главная, мобильная (390 px) — основной экран, его владелец увидит первым.
2. Главная, десктоп (1440 px) — только первый экран и пара блоков, чтобы показать адаптив.
3. Админка: вход (мобильная).
4. Админка: список Тарифов (мобильная).
5. Админка: редактирование Тарифа (мобильная).

Порядок: сначала загрузите в Stitch оба логотипа (`refs/logo-main.png`, `refs/logo-women.png`) как референсы, затем вставьте **общий стиль** и промпт экрана 1. Остальные экраны генерируйте в том же проекте («generate another screen»), каждый раз добавляя общий стиль.

## Фирменный стиль (взят из их Instagram и Taplink)

- Логотип: жёлтый круглый знак на чёрном, «ATHLETIC'S GYM», 2022. Есть отдельная версия для женского зала (силуэт девушки с гантелями).
- Цвета:
  - Жёлтый акцент `#F5E642` (из логотипа)
  - Почти чёрный фон `#141416`, карточки `#1F1F23`
  - Текст `#F4F4F5`, вторичный `#A1A1AA`
  - WhatsApp-зелёный `#25D366` только для кнопки WhatsApp
- Настроение: тёмный, мощный, «железный» зал; жёлтый — только для акцентов и главной кнопки.
- Шрифт: заголовки — плотный гротеск капсом (Oswald / Bebas Neue / Manrope ExtraBold, с кириллицей и казахскими буквами ә ғ қ ң ө ұ ү һ і), текст — Inter или Manrope.

## Факты, которые должны быть в дизайне (не придумывать другие)

- Адрес: ул. Султана Бейбарса, 2а, цокольный этаж, Кызылорда
- Часы: ежедневно 08:00–23:00 (уточнить у зала)
- WhatsApp: +7 771 484 6344, Instagram: @athletics_gym_qyzylorda, женский зал: @athletics__gym__women
- Цены: «Месячный абонемент — от 9 000 ₸», «Годовой — от 140 000 ₸», «Разовое посещение — есть»
- Первое занятие бесплатно (с их Taplink)
- Направления: функциональный тренинг, кроссфит, сайкл, TRX, персональные тренировки
- Отдельный женский тренажёрный зал
- Рейтинг: 5,0 · 405 оценок в 2ГИС
- Оплата: карта, наличные, QR

Заглушки (подписать как демо):
- Тренеры — 3 карточки без имён: «Тренер», серый силуэт вместо фото, теги направлений.
- Расписание — недельная сетка с бейджем «ДЕМО».

---

## Промпты (вставлять в Stitch на английском — так он генерирует точнее; тексты интерфейса на русском)

### Общий стиль (добавлять к каждому промпту)

```
Style: dark, bold, premium "iron gym" aesthetic. Background #141416, cards #1F1F23 with 16px radius, primary accent yellow #F5E642 used only for key buttons, highlights and icons; body text #F4F4F5, secondary #A1A1AA. WhatsApp buttons in #25D366 with the WhatsApp icon. Headings: condensed bold uppercase sans-serif (Oswald-like) with full Cyrillic; body: Inter. Use the uploaded round yellow-on-black logo. Large touch targets, generous spacing, no stock-photo clutter: use dark moody gym photos (barbells, racks, people training) as placeholders. All interface text in Russian. Language switcher "RU | KZ" in the header.
```

### Экран 1 — Главная, мобильная

```
Mobile landing page (390px wide, one long scrolling page) for "Athletic's Gym", a gym in Kyzylorda, Kazakhstan. Sticky bottom bar on mobile with a big yellow button "Бесплатное первое занятие" and a round green WhatsApp icon button.

Sections in order:
1. Header: logo left, "RU | KZ" switcher and burger menu right.
2. Hero: full-bleed dark gym photo, headline "КҮШ. ШЫДАМДЫЛЫҚ. НӘТИЖЕ.", subheadline "Тренажёрный зал и функциональный тренинг в центре Кызылорды", primary yellow button "Записаться на бесплатное занятие" (opens WhatsApp), secondary outline button "Цены". Below: small badge "★ 5,0 · 405 оценок в 2ГИС".
3. "О зале": 4 icon tiles in a 2x2 grid: "Новые тренажёры", "Отдельный женский зал", "Кондиционеры", "Открыто 08:00–23:00".
4. "Женский зал": card with a photo and the women's logo, text "Отдельный тренажёрный зал только для женщин", link "Instagram женского зала".
5. "Направления": horizontally scrollable cards: Функциональный тренинг, Кроссфит, Сайкл, TRX, Персональные тренировки — each with photo, title, one-line description.
6. "Цены": 3 price cards: "Месячный — от 9 000 ₸", "Годовой — от 140 000 ₸" (highlighted with yellow border and tag "Выгоднее"), "Разовое посещение — уточняйте". Under them a note "Первое занятие — бесплатно" and button "Узнать точную цену в WhatsApp". Small line "Оплата: карта, наличные, QR".
7. "Тренеры": 3 placeholder trainer cards with grey silhouette avatar, label "Тренер", tags like "Кроссфит", "Персональные", and a small grey "демо" badge.
8. "Расписание": weekly schedule with day tabs (Пн Вт Ср Чт Пт Сб Вс) and a list of classes for the selected day: time, class name, trainer placeholder; a yellow "ДЕМО" badge next to the section title.
9. "Отзывы": a 2GIS rating card "5,0 ★★★★★ · 405 оценок" with button "Читать отзывы в 2ГИС".
10. "Контакты": address "ул. Султана Бейбарса, 2а, цокольный этаж", hours "Ежедневно 08:00–23:00", map placeholder, buttons "Построить маршрут", "WhatsApp", "Instagram".
11. Footer: logo, small links, "© Athletic's Gym, 2026".
```

### Экран 2 — Главная, десктоп

```
Desktop version (1440px) of the same Athletic's Gym landing page. Top navigation: logo, links "О зале · Женский зал · Направления · Цены · Тренеры · Расписание · Контакты", "RU | KZ", yellow button "Бесплатное занятие". Hero split layout: left — big uppercase headline "КҮШ. ШЫДАМДЫЛЫҚ. НӘТИЖЕ.", subheadline, two buttons, rating badge "★ 5,0 · 405 оценок в 2ГИС"; right — large dark gym photo. Below show the "Цены" section with three price cards in a row (the yearly one highlighted) and the "Направления" section as a 5-column card grid. Floating round green WhatsApp button bottom-right.
```

### Экран 3 — Админка: вход

```
Mobile admin login screen for the gym website. Centered logo, title "Вход для администратора", fields "Логин" and "Пароль" (with show/hide eye icon), big yellow button "Войти", small grey text "Только для сотрудников Athletic's Gym". Minimal, dark, same style.
```

### Экран 4 — Админка: список Тарифов

```
Mobile admin screen "Тарифы". Top bar: back arrow, title "Тарифы", small avatar menu. Tariffs are grouped by fixed categories shown as section headers: "Месячный", "Годовой", "Разовое посещение", "Персональная тренировка". Each tariff is a row card: name (e.g. "Месячный безлимит"), price in large bold ("9 000 ₸"), duration ("30 дней"), a toggle "Показывать на сайте", and an edit pencil icon. Each category header shows "от 9 000 ₸ на сайте" in grey (the minimum price). Floating yellow "+" button "Добавить тариф". A green toast at the bottom: "Цена обновлена — уже на сайте".
```

### Экран 5 — Админка: редактирование Тарифа

```
Mobile admin form "Редактировать тариф". Fields: "Категория" (select: Месячный / Годовой / Разовое посещение / Персональная тренировка), "Название (RU)" required, "Атауы (KZ)" optional with helper text "Если пусто — покажем русский", "Цена, ₸" large numeric input, "Срок" (number + unit select: дней / месяцев / посещение), "Описание (RU)" and "Сипаттама (KZ)" textareas, toggle "Показывать на сайте". Sticky bottom: yellow button "Сохранить" and text button "Удалить тариф" in muted red. Same dark style.
```

## Что прислать мне из Stitch

- Скриншоты (PNG) всех 5 экранов.
- Если Stitch даёт экспорт HTML/Tailwind — тоже пришлите: я возьму оттуда отступы и цвета, но вёрстку сделаю сам на Next.js.
