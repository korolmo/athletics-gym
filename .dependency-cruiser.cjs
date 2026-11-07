// Границы кода (этап 6, ADR 0015). Проверка — `npm run deps:check` (CI, job «Dependency boundaries»).
// Нарушения, которые уже есть, записаны в .dependency-cruiser-known-violations.json (`npm run deps:baseline`)
// и не валят проверку; новое нарушение — ошибка. Каждый перенесённый модуль убирает свои строки из списка,
// в конце этапа список пуст.
//
// Модули — src/modules/<имя>/ (Фото — photos, Тарифы — tariffs, Тренеры — trainers, Направления — directions,
// Отзывы — reviews, Обращения — contacts, Сайт — site, Аккаунт Владельца — owner, Главная — home).
// Внутри модуля — те же слои: domain → validation → service. Снаружи модуль виден только через свой index.ts.
// Платформа (src/lib: db, логи, i18n, SEO, юридические тексты, помощники админки) — под модулями: модули её
// импортируют, она модули — нет.

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
      comment: "К Prisma ходят только сервисы и лимит попыток входа (CLAUDE.md, «Слои»).",
      from: { pathNot: ["^src/lib/services/", "^src/modules/[^/]+/service", "^src/lib/auth/login-limit\\.ts$", "^src/lib/db\\.ts$"] },
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
        "Платформа под модулями: src/lib модули не импортирует. Временно (до PR «Главная»): сервисы сущностей, ещё " +
        "не перенесённых в модули (src/lib/services/*), — это модули в ожидании, им можно импортировать модули через " +
        "index.ts. health.ts — платформа: хранилище ему передают маршруты.",
      from: { path: "^src/lib/", pathNot: "^src/lib/services/(?!health\\.ts$)" },
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
        "Фото — базовый модуль (решение 8 этапа 6): не импортирует ни другие модули, ни сущности, ещё лежащие в " +
        "src/lib. Связь по данным (чужие таблицы) этим правилом не видна — её держит src/modules/photos/tables.test.ts.",
      from: { path: "^src/modules/photos/" },
      to: {
        path: ["^src/modules/(?!photos/)", "^src/lib/(domain|validation|services|presentation)/"],
        pathNot: ["^src/lib/services/result\\.ts$", "^src/lib/validation/shared\\.ts$"],
      },
    },
    {
      name: "home-is-top",
      severity: "error",
      comment: "Главная собирает все модули; её не импортирует ни один модуль.",
      from: { path: "^src/modules/", pathNot: "^src/modules/home/" },
      to: { path: "^src/modules/home/" },
    },

    // --- До переноса в модули: связи сервисов разных сущностей ---
    {
      name: "no-cross-entity-services",
      severity: "error",
      comment:
        "Сервис одной сущности не импортирует сервис другой. Пока файлы лежат в src/lib/services, это единственная " +
        "проверяемая граница сущностей; после переноса её заменяют правила модулей.",
      from: { path: "^src/lib/services/([^/]+)\\.ts$" },
      to: { path: "^src/lib/services/", pathNot: ["^src/lib/services/(result|$1)\\.ts$"] },
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
