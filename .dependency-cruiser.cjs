// Границы кода (этап 6, ADR 0015). Проверка — `npm run deps:check` (CI, job «Dependency boundaries»).
// Список известных нарушений (.dependency-cruiser-known-violations.json, `npm run deps:baseline`) с 7 ноября 2026
// пуст: любое нарушение — ошибка. Перезаписывать его, чтобы «пропустить» новое нарушение, нельзя.
//
// Модули — src/modules/<имя>/. Базовые: Фото — photos, Аккаунт Владельца — owner. Сущности: Тарифы — tariffs,
// Тренеры — trainers, Направления — directions, Отзывы — reviews, Обращения — contacts, Сайт — site.
// Поверх всех: Главная — home, Юридические документы — legal.
// Внутри модуля — те же слои: domain → validation → service. Снаружи модуль виден только через index.ts (сервер)
// и client.ts (браузер, middleware). Платформа (src/lib: db, логи, i18n, SEO, health, хэш адреса, помощники
// форм) — под модулями: модули её импортируют, она модули — нет.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Циклов в нашем коде нет и не будет: цикл склеивает модули в один.",
      from: { path: "^src/" },
      to: { circular: true },
    },

    // --- Слои ---
    {
      name: "domain-is-pure",
      severity: "error",
      comment: "Модель и правила домена — чистые функции: без базы, хранилища, сессии, zod-форм и интерфейса.",
      from: { path: "^src/(lib|modules/[^/]+)/domain/" },
      to: {
        path: [
          "^src/(app|components|pages)/",
          "^src/lib/(validation|services|presentation|admin|auth|storage)/",
          "^src/lib/db\\.ts$",
          "^src/modules/[^/]+/(validation|service|presentation)",
          "@prisma/client",
        ],
      },
    },
    {
      name: "validation-no-io",
      severity: "error",
      comment: "Разбор форм (zod) не ходит в базу и хранилище — это делают сервисы.",
      from: { path: "^src/(lib|modules/[^/]+)/validation/" },
      to: {
        path: ["^src/(app|components|pages)/", "^src/lib/(services|storage)/", "^src/lib/db\\.ts$", "^src/modules/[^/]+/service", "@prisma/client"],
      },
    },
    {
      name: "db-only-in-services",
      severity: "error",
      comment: "К Prisma ходят только сервисы (лимит попыток входа — тоже сервис, модуль Аккаунт Владельца).",
      from: { pathNot: ["^src/lib/services/", "^src/modules/[^/]+/service", "^src/lib/db\\.ts$"] },
      to: { path: "^src/lib/db\\.ts$" },
    },
    {
      name: "prisma-only-in-db",
      severity: "error",
      comment: "Клиент Prisma создаётся в одном месте — src/lib/db.ts.",
      from: { path: "^src/", pathNot: "^src/lib/db\\.ts$" },
      to: { path: "@prisma/client", dependencyTypesNot: ["type-only"] },
    },
    {
      name: "lib-no-ui",
      severity: "error",
      comment: "Платформа и слои не импортируют интерфейс.",
      from: { path: "^src/lib/" },
      to: { path: "^src/(app|components|pages)/" },
    },

    // --- Модули ---
    {
      name: "lib-no-modules",
      severity: "error",
      comment:
        "Платформа под модулями: src/lib модули не импортирует. Что платформе нужно от модуля (хранилище Фото и " +
        "проверка Владельца для health), передаёт слой приложения; что ей нужно от данных модуля (поля Настроек для " +
        "SEO) — она описывает своим типом.",
      from: { path: "^src/lib/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "modules-no-ui",
      severity: "error",
      comment: "Модуль не знает об интерфейсе: страницы и секции импортируют модуль, а не наоборот.",
      from: { path: "^src/modules/" },
      to: { path: "^src/(app|components|pages)/" },
    },
    {
      name: "module-via-index-outside",
      severity: "error",
      comment:
        "Снаружи модуль виден только через свой index.ts (`@/modules/<имя>`) или, для браузера, client.ts " +
        "(`@/modules/<имя>/client`: index.ts серверный, с ним клиентская сборка падает на server-only).",
      from: { pathNot: "^src/modules/" },
      to: { path: "^src/modules/[^/]+/.+", pathNot: "^src/modules/[^/]+/(index|client)\\.ts$" },
    },
    {
      name: "module-via-index-between",
      severity: "error",
      comment: "Другой модуль виден только через свой index.ts (или client.ts).",
      from: { path: "^src/modules/([^/]+)/" },
      to: { path: "^src/modules/[^/]+/", pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/(index|client)\\.ts$"] },
    },
    {
      name: "photos-knows-no-one",
      severity: "error",
      comment:
        "Фото — базовый модуль (решение 8 этапа 6): не импортирует ни другие модули (кроме Аккаунта Владельца — " +
        "requireOwner нужен всем), ни сущности, ещё лежащие в src/lib. Связь по данным (чужие таблицы) этим правилом " +
        "не видна — её держит src/modules/photos/tables.test.ts.",
      from: { path: "^src/modules/photos/" },
      to: {
        path: ["^src/modules/(?!photos/|owner/)", "^src/lib/(domain|validation|services|presentation)/"],
        pathNot: ["^src/lib/services/result\\.ts$", "^src/lib/validation/shared\\.ts$"],
      },
    },
    {
      name: "club-knows-no-one",
      severity: "error",
      comment:
        "Клуб — базовый модуль (этап П1, ADR 0018): название, город, бренд и пояс нужны всем, поэтому сам он не " +
        "импортирует ни один модуль, кроме Аккаунта Владельца (requireOwner для формы «Клуб»).",
      from: { path: "^src/modules/club/" },
      to: { path: "^src/modules/(?!club/|owner/)" },
    },
    {
      name: "clients-knows-no-one",
      severity: "error",
      comment:
        "Клиенты — базовый модуль (этап 1, ADR 0016): вход, сессия и Согласие Клиента не зависят ни от одного модуля. " +
        "Записи и Окна берут requireClient у него, а не наоборот; дата редакции Политики приходит из слоя приложения.",
      from: { path: "^src/modules/clients/" },
      to: { path: "^src/modules/(?!clients/)" },
    },
    {
      name: "schedule-knows-only-owner",
      severity: "error",
      comment:
        "Окна Тренера (этап 1, ADR 0017) знают только Аккаунт Владельца (requireOwner в админке). С Тренером связь — " +
        "внешний ключ в базе, занятое время Записей передаёт слой приложения: Записи зависят от Окон, не наоборот.",
      from: { path: "^src/modules/schedule/" },
      to: { path: "^src/modules/(?!schedule/|owner/)" },
    },
    {
      name: "notifications-knows-no-one",
      severity: "error",
      comment:
        "Уведомления (этап 1, ADR 0017) — очередь и отправка, ни от одного модуля не зависят: событие передаёт " +
        "модуль-хозяин в своей транзакции, проверку Владельца для админки — слой приложения аргументом.",
      from: { path: "^src/modules/notifications/" },
      to: { path: "^src/modules/(?!notifications/)" },
    },
    {
      name: "bookings-on-top-of-entities",
      severity: "error",
      comment:
        "Записи (этап 1, ADR 0017) стоят над Клиентами, Тренерами и Окнами: их не импортирует ни один модуль, кроме " +
        "модулей поверх всех. Что нужно Окнам от Записей (занятое время), передаёт слой приложения.",
      from: { path: "^src/modules/([^/]+)/", pathNot: "^src/modules/(bookings|home|legal)/" },
      to: { path: "^src/modules/bookings/" },
    },
    {
      name: "top-modules",
      severity: "error",
      comment:
        "Модули поверх остальных: Главная (собирает все модули) и Юридические документы (числа в текстах — из правил " +
        "модулей). Их не импортирует ни один другой модуль: что им нужно от остальных, они берут сами, а что нужно " +
        "остальным от них (дата редакции Политики для Согласия) — передаёт слой приложения.",
      from: { path: "^src/modules/([^/]+)/", pathNot: "^src/modules/(home|legal)/" },
      to: { path: "^src/modules/(home|legal)/" },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["\\.test\\.tsx?$", "\\.d\\.ts$"] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
    },
  },
};
