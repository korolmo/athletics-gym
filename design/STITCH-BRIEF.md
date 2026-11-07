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

---

## Страницы ошибок (октябрь 2026)

Экраны в том же проекте Stitch (4810510334939218653): «404 — Мобильная / Десктоп», «500 — Мобильная / Десктоп», «503 — Мобильная / Десктоп», «503 Статическая — Мобильная / Десктоп», «Админка — Раздел не найден (404)», «Админка — Ошибка загрузки раздела». Свёрстаны 23 октября 2026 (ADR 0013).

> Исходный текст промпта в репозиторий не попал. Ниже он восстановлен по готовым экранам и записан тем же способом, что и промпты выше. Если найдётся оригинал — заменить.

Тексты в макетах черновые; окончательные — в словарях (`src/dictionaries/errors/ru.ts`, `kk.ts`). При вёрстке из макетов убрано то, чего у зала нет или что сайт не знает: «В зале 24 чел.», «Расписание», «Заявки», счётчики разделов, «Iron Discipline», техподдержка «главного тренера», `© 2024`. Номер WhatsApp не берём из кода: на 500 и статической 503 вместо него ссылка на карточку зала в 2ГИС.

### Общее для страниц ошибок (добавлять к общему стилю)

```
Error pages for the same Athletic's Gym site, same dark style and tokens as the landing page (background #0E0E10, cards #1F1F23, accent #F5E642 only for the main button and line-art, text #F4F4F5 / #A1A1AA). Each page: compact header (logo, "ATHLETIC'S GYM", "RU | KZ"), a small rounded status chip with a pulsing yellow dot above the illustration (e.g. "Ошибка 404"), a large line-art illustration drawn with thin yellow strokes on dark (barbell plates, knurling marks — "iron gym" mood, no photos), an uppercase bold headline, one or two lines of calm muted text, big touch-friendly buttons (52px, full width on mobile, side by side on desktop), and a slim footer. Friendly, short, never blame the visitor. No fake live data (no visitor counters, no schedules). Mobile 390px and desktop 1440px versions.
```

### 404 — страница не найдена

```
404 page. Illustration: outlined "4" + a barbell plate as the "0" (plate rim, inner hub, "ATHLETIC'S" and "25 KG" engraved) + "4", on a dashed horizontal barbell line. Chip "Ошибка 404". Headline "Такой страницы нет". Text "Возможно, ссылка устарела или в адресе опечатка. Зато зал на месте." Buttons: yellow "На главную" with an arrow, dark "Цены и абонементы". Below: a pill "Быстрый переход: Тренеры · Женский зал · Контакты", and a club card with a dumbbell icon, "Athletic's Gym · Кызылорда", the address and a green-dot badge with opening hours.
```

### 500 — ошибка сервера

```
500 page. Illustration: a heavy barbell plate with a thin yellow crack running through it, big white "500" over the plate. Chip "Ошибка 500". Headline "Что-то пошло не так". Text "Страница не загрузилась из-за сбоя на сервере. Попробуйте ещё раз через минуту." Buttons: yellow "Попробовать снова" with a refresh icon, dark "На главную", dark "Контакты зала в 2ГИС" with a pin icon. Below: a small card "Код ошибки: a1b2c3d4" in monospace with a copy button and the hint "Назовите этот код, если будете нам писать: так мы быстрее найдём сбой."
```

### 503 — технические работы

```
503 maintenance page (the app is up, the site is closed for works). Illustration: a plate with a crossed dumbbell and wrench drawn in yellow lines, a small "503" badge under it. Chip "Технические работы · 503". Headline "Идут технические работы". Text "Сайт скоро снова откроется. Зал работает как обычно." Buttons: green WhatsApp "Написать в WhatsApp" (dark text and icon on green), dark "Позвонить" with a phone icon. Card with two columns: "Часы работы" (green dot + hours) and "Адрес".

> Реализация (24 октября, ADR 0013): этот макет не сверстан. На Vercel страницу 503 приложения подменяет платформа, поэтому технические работы показывает та же двуязычная страница, что и «503 Статическая», с текстом «Идут технические работы». Её отдаёт middleware, WhatsApp и часов на ней нет. Страница 404 тоже без часов работы: она статическая, без базы.
```

### 503 — статическая страница веб-сервера

```
Static fallback page served by the web server when the app is down: plain HTML, no scripts, no web fonts, works without the app. Centered column 400px: round logo, yellow "503", a tiny barbell line, one card with both languages — RU "Сайт временно недоступен / Обновите страницу через несколько минут. Зал работает как обычно.", a divider, KZ "Сайт уақытша қолжетімсіз / Бірнеше минуттан кейін бетті жаңартыңыз. Зал әдеттегідей жұмыс істейді." Buttons: yellow "Обновить страницу / Бетті жаңарту", dark "2ГИС". Footer "Athletic's Gym · Кызылорда".
```

### Админка — раздел не найден и ошибка загрузки

```
Two mobile admin screens inside the admin shell (top bar with logo, "Админка", "Сайт ↗", "Выйти" and the section tabs). A small chip with a red dot ("Ошибка 404" / "Ошибка 500"), then one centered card with a thin yellow gradient line on top and a square icon badge (magnifier / warning triangle).
404: headline "Раздел не найден", text "Возможно, запись удалили, раздел переименовали или в адресе опечатка.", the current path in a monospace strip, yellow button "К разделам админки".
Error: headline "Не удалось загрузить раздел", text "Сохранённые данные на месте. Попробуйте ещё раз; если ошибка повторится — сообщите код разработчику.", a dark strip "Код ошибки" with a monospace code and a copy button, yellow "Попробовать снова", dark "К разделам".
```

---

## Личный кабинет Клиента и запись к Тренеру (этап 1, ноябрь 2026)

Экраны в том же проекте Stitch (4810510334939218653). Генерировать **рядом с готовыми экранами главной** («generate another screen»), чтобы Stitch взял их стиль. План этапа — `docs/stages/stage-1-cabinet.md`, термины — `GLOSSARY.md`: **Клиент** (человек с входом в кабинет), **Запись** (персональная тренировка у Тренера на время), **Окно** (время, на которое можно записаться). В интерфейсе не писать «бронь», «слот», «пользователь».

Что в кабинете есть и чего нет (не рисовать лишнего):
- Вход — телефон и одноразовый код. В Лаборатории код показывается на экране, номера — только тестовые.
- Записывается Клиент только на **персональную тренировку у Тренера**. Групповых занятий, Расписания и лимита мест в зале нет.
- Оплаты онлайн нет: «оплата в зале». Абонементов, баланса, визитов, бонусов, QR-пропуска нет.
- Отменить Запись Клиент может сам не позже чем за 12 часов, позже — только через зал (WhatsApp). Будущих Записей — не больше 3.
- Тренеры в Лаборатории вымышленные: в макете — имена-заглушки и серый силуэт вместо фото.
- Сверху на всех страницах Лаборатории — тонкая плашка «Демо-версия» (она уже есть на сайте).

### Общее для кабинета (добавлять к общему стилю сайта)

```
Client cabinet pages for the same Athletic's Gym website. Reuse EXACTLY the look of the existing landing page screens in this project: background #131315, cards #1F1F23 with 1px border #2E2E33 and 12px radius, primary accent yellow #F5E642 (text on yellow #363100) only for the main action, selected states and small highlights; text #F4F4F5, muted #A1A1AA; Manrope for everything (bold uppercase headings with letter-spacing, like the landing page section titles), Material Symbols Outlined icons. Same sticky header as the landing page (logo, "ATHLETIC'S GYM", "RU | KZ") but with a round person icon button "Кабинет" on the right instead of the CTA. Mobile 390px first, plus a desktop 1440px version where the content sits in a centered 560–720px column. Large touch targets (min 48px), calm and clear, no promo clutter, no photos except trainer avatars. All interface text in Russian.
```

### К1 — Вход: номер телефона

```
Cabinet login, step 1. Title "ВХОД В КАБИНЕТ", subtitle "Записывайтесь к тренеру и смотрите свои записи". One field "Номер телефона" with a fixed "+7" prefix and placeholder "700 000 00 01". Yellow full-width button "Получить код". Muted note "Код придёт на этот номер. Пароль не нужен." Below the card, a small dashed-border info box with a flask icon: "Демо-версия: войти можно только с тестовыми номерами +7 700 000 00 01 … 09, код покажем на экране."
```

### К2 — Вход: код и первый вход

```
Cabinet login, step 2. Title "ВВЕДИТЕ КОД", text "Отправили на +7 700 000 00 01 · Изменить номер". Six large separate digit boxes for a one-time code. A yellow-outlined demo box: "Демо: ваш код 482 913". Link "Отправить код ещё раз (через 0:45)".
Second variant of the same screen for the first login: under the code add field "Как вас зовут" (placeholder "Имя"), and a required checkbox "Согласен на обработку данных по Политике конфиденциальности" (underlined link). Yellow button "Войти". An inline error example under the code: red text "Неверный код. Осталось попыток: 3".
```

### К3 — Мои Записи

```
Cabinet home "МОИ ЗАПИСИ". Greeting line "Здравствуйте, Айгерим". Yellow button "Записаться к тренеру" with a plus icon. Section "Будущие" with up to 3 booking cards: date block on the left (big "12", "НОЯ", "ВТ"), then "19:00–20:00", trainer avatar + "Тренер Арман", hall chip "Общий зал", and a text button "Отменить". One card shows instead of the cancel button a muted note "Отменить можно только через зал" with a small green WhatsApp link "Написать в зал". Section "Прошедшие" with compact greyed rows. Small counter "2 из 3 будущих записей". Also an empty-state variant: line-art barbell icon in thin yellow strokes, "Записей пока нет", button "Записаться к тренеру".
Bottom tab bar on mobile with three items: "Записи", "Записаться", "Профиль".
```

### К4 — Запись к Тренеру

```
Booking flow on one screen, step by step from top to bottom. Title "ЗАПИСЬ К ТРЕНЕРУ".
1) Hall switch as two segmented pills "Общий зал" / "Женский зал" (same switch style as the prices section of the landing page).
2) Trainer cards in a horizontal scroll: grey silhouette avatar, name "Тренер Арман", directions as small tags, the selected one with a yellow border.
3) Days as a horizontal strip of 14 day chips ("ПН 10", "ВТ 11"...), days without free time greyed out, selected day filled yellow.
4) Free times as a grid of time chips "08:00", "09:00", "19:00"... (taken times are not shown at all); one selected chip filled yellow.
Sticky bottom summary card: "Вт, 11 ноября · 19:00–20:00 · Тренер Арман · Общий зал", muted "Оплата в зале по тарифу тренера", yellow button "Записаться".
```

### К5 — Результат записи

```
Two small result screens. Success: a yellow check in a thin circle, headline "ВЫ ЗАПИСАНЫ", the booking card from "Мои Записи", note "Отменить можно до 07:00 11 ноября — за 12 часов", buttons "К моим записям" (yellow) and "Записаться ещё" (dark). Conflict: an amber clock icon, headline "ЭТО ВРЕМЯ УЖЕ ЗАНЯЛИ", text "Пока вы выбирали, на это время записался другой клиент. Выберите другое.", yellow button "Выбрать другое время". Also a limit variant: "У вас уже 3 будущие записи" with button "К моим записям".
```

### К6 — Профиль

```
Cabinet "ПРОФИЛЬ". Card with field "Имя" (editable, "Сохранить" button) and read-only "Телефон +7 700 000 00 01". Card "Безопасность": dark buttons "Выйти" and "Выйти на всех устройствах". Danger zone card with thin red border: "Удалить аккаунт", text "Удалим имя и телефон. Прошедшие записи останутся без ваших данных.", muted red button "Удалить аккаунт". Show the confirmation dialog too: "Удалить аккаунт?", "Это нельзя отменить", buttons "Удалить" (red) and "Отмена". Footer links "Политика конфиденциальности · Пользовательское соглашение".
```

### Админка — Записи и Окна Тренера

Админка в своём стиле (Oswald + Inter, фон #141416), как экраны 3–5 выше.

```
Admin screens in the existing admin style (background #141416, cards #1F1F23, accent #F5E642, headings Oswald uppercase, body Inter), mobile 390px and desktop 1440px.
A) "ЗАПИСИ": a new admin section tab "Записи". Week view: day selector at the top, then columns per trainer (on mobile — one trainer at a time with a trainer switcher). Each booking block: time, client name "Айгерим", masked phone "+7 700 *** ** 01", status. Tapping a booking opens a sheet with "Отменить запись" (muted red) and the note "Клиент увидит отмену в кабинете". Filter chips "Общий зал / Женский зал". A small badge in the header "Не доставлено: 2" linking to C.
B) Trainer edit page, new card "ЧАСЫ РАБОТЫ": seven rows Пн–Вс, each with a toggle and "с 09:00 до 13:00" + "+ ещё интервал"; field "Длительность тренировки: 60 мин". Card "ИСКЛЮЧЕНИЯ": list "15–20 ноября — отпуск", "25 ноября — выходной", button "+ Добавить исключение". Note "Свободные окна считаются сами: часы работы минус исключения и уже сделанные записи."
C) "НЕ ДОСТАВЛЕННЫЕ УВЕДОМЛЕНИЯ": list of failed Telegram notifications: event "Новая запись · Айгерим · 11 ноя 19:00", "Попыток: 8", last error in monospace, button "Отправить ещё раз".
```

### Что прислать

- Скриншоты всех экранов (мобильная и десктоп) и экспорт HTML — в `design/stitch/cabinet/`.
- Тексты в макетах — черновые: окончательные будут в словарях (`src/dictionaries`), казахские — там же.
