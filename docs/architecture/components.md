# C4: компоненты приложения (уровень 3)

Контейнер «Приложение Next.js» из [containers.md](./containers.md), разрезанный на модули на этапе 6 (ADR 0015).
Связи сняты с кода 7 ноября 2026 (dependency-cruiser, PR 12), модули этапа 1 (кабинет Клиента, ADR 0016–0017) дорисованы 10 ноября — та же картина в сводке каждого прогона CI (job «Dependency boundaries», артефакт `deps-graph`). Если рисунок и граф CI разошлись, прав граф: поправьте рисунок в том же PR.

```mermaid
flowchart TB
  subgraph app["Слой приложения — src/app, src/components, middleware"]
    pages["Страницы сайта и админки,<br/>server actions, маршруты API"]
    slots["photos/slots.ts — места для Фото<br/>revalidate.ts — сброс кэша<br/>outbox-kick.ts — попутная отправка уведомлений"]
  end

  subgraph top["Поверх всех"]
    home["Главная<br/>home"]
    legal["Юридические документы<br/>legal"]
  end

  subgraph booking["Запись к Тренеру (этап 1)"]
    bookings["Записи<br/>bookings"]
    schedule["Окна<br/>schedule"]
  end

  subgraph entities["Сущности"]
    site["Сайт<br/>site"]
    reviews["Отзывы<br/>reviews"]
    trainers["Тренеры<br/>trainers"]
    tariffs["Тарифы<br/>tariffs"]
    directions["Направления<br/>directions"]
    contacts["Обращения<br/>contacts"]
  end

  subgraph base["Базовые"]
    photos["Фото<br/>photos"]
    owner["Аккаунт Владельца<br/>owner"]
    clients["Клиенты<br/>clients"]
    notifications["Уведомления<br/>notifications"]
  end

  platform["Платформа — src/lib<br/>db, логи, i18n, SEO, health, хэш адреса, помощники форм"]

  pages --> home & legal & site & reviews & trainers & tariffs & directions & contacts & photos & owner & bookings & schedule & clients & notifications
  slots --> photos & site & tariffs & trainers & directions

  home --> site & tariffs & trainers & photos
  legal --> site & reviews & owner & clients & bookings

  bookings --> schedule & clients & notifications & trainers & tariffs & owner
  schedule --> owner

  site --> photos & owner
  reviews --> tariffs & owner
  trainers --> tariffs & photos & owner
  tariffs --> photos & owner
  directions --> photos & owner
  contacts --> owner

  photos --> owner

  top & booking & entities & base -.-> platform
```

## Как читать

- **Стрелка — «импортирует через `index.ts` / `client.ts`».** Внутрь чужого модуля не ходит никто (`module-via-index-*`).
- **Вверх стрелок нет.** Платформа не импортирует модули (`lib-no-modules`); Главную и Юридические документы не импортирует ни один модуль (`top-modules`); Фото знает только Аккаунт Владельца (`photos-knows-no-one`). Клиенты и Уведомления не знают никого (`clients-knows-no-one`, `notifications-knows-no-one`), Окна — только Аккаунт Владельца (`schedule-knows-only-owner`), Записи не импортирует ни одна сущность (`bookings-on-top-of-entities`).
- **Обратные потребности — через слой приложения.** Фото не знает владельцев мест — места собирает `slots.ts`; Тарифам нужен Зал Тренера — его передаёт действие админки; Отзывам нужна дата редакции Политики — её передаёт действие сайта; `health` получает хранилище Фото и проверку Владельца от маршрутов; Уведомления получают событие запросом Записей в их транзакции (`enqueue`), а отправку запускает слой приложения (`outbox-kick.ts`); Окна связаны с Тренером только внешним ключом с каскадом.
- **Таблицы — только у хозяина.** У каждого модуля `tables.test.ts`: Главная и Юридические документы своих таблиц не имеют, Фото — только Галерея. Запись в чужую таблицу в общей транзакции — запросом модуля-хозяина (`moveTrainerTariffs`).

| Модуль | Таблицы | Входы |
|---|---|---|
| owner | `owner`, `loginAttempt` | `index.ts`, `client.ts` (middleware, форма пароля) |
| photos | `galleryPhoto` | `index.ts`, `client.ts` |
| tariffs | `hall`, `tariff` | `index.ts`, `client.ts` |
| trainers | `trainer` | `index.ts`, `client.ts` |
| directions | `direction` | `index.ts`, `client.ts` |
| reviews | `review`, `reviewSubmission` | `index.ts`, `client.ts` |
| contacts | `contactClick` | `index.ts`, `client.ts` |
| site | `siteSettings`, `aboutCard` | `index.ts`, `client.ts` |
| home | — | `index.ts` |
| legal | — | `index.ts`, `client.ts` (адреса и даты редакций) |
| clients | `client`, `clientLoginCode` | `index.ts`, `client.ts` (middleware: cookie сессии Клиента) |
| schedule | `trainerSchedule`, `trainerWorkHours`, `trainerTimeOff` | `index.ts`, `client.ts` |
| bookings | `booking` | `index.ts`, `client.ts` (лимиты и срок отмены — для текстов) |
| notifications | `outboxEvent` | `index.ts`, `client.ts` (правила повторов и подписи событий) |
