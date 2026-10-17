# C4: контейнеры (этап 0, 17 октября 2026)

Одна кодовая база (ADR 0001), две среды выполнения (ADR 0005): **Лаборатория** на Vercel развивается непрерывно из `main`, **прод** клиента на hoster.kz заморожен на релизном теге и выкатывается вручную (ADR 0006). CI проверяет, что код по-прежнему влезает в рамки прода (прод-двойник).

## Контекст

```mermaid
C4Context
  title Athletic's Gym — контекст
  Person(visitor, "Посетитель", "Смотрит сайт, нажимает кнопки связи, оставляет Отзыв")
  Person(owner, "Владелец", "Ведёт Тарифы, Тренеров, Фото, Отзывы в админке; решает о релизах")
  Person(dev, "Разработчик", "Ветки и PR в main; релиз прода — по решению Владельца")
  System(prod, "Боевой сайт athleticsgym.kz", "v1.0.0, hoster.kz — реальные данные клуба")
  System(lab, "Лаборатория", "athletics-gym-lab.vercel.app — платформа, синтетические данные")
  System_Ext(wa, "WhatsApp / телефон / Instagram", "Канал обращения")
  System_Ext(gh, "GitHub", "Репозиторий, Actions, Pages")
  Rel(visitor, prod, "HTTPS")
  Rel(owner, prod, "Админка")
  Rel(visitor, wa, "Обращение")
  Rel(dev, gh, "PR, merge, релизный тег")
  Rel(gh, lab, "Выкатка main / превью PR")
  Rel(gh, prod, "Только ручной запуск с подтверждением")
```

## Контейнеры

```mermaid
flowchart LR
  subgraph GH["GitHub"]
    repo["Репозиторий\nmain · теги vX.Y.Z"]
    ci["CI (ci.yml)\nlint · typecheck · тесты на MariaDB 10.4\nсборка · прод-двойник"]
    labwf["Lab (lab.yml)\nvercel deploy: main → prod, PR → превью"]
    deploywf["Deploy (deploy.yml)\nтолько workflow_dispatch + тег\nenvironment production (ревьюер)"]
    mon["Monitor Lab (monitor.yml)\ncron */5 → /ru /kk /api/health/ready"]
    monbr[("ветка monitoring\ndata/*.jsonl · status.json")]
    pages["GitHub Pages\nстраница статуса"]
    deploybr[("ветка deploy\nсобранный standalone")]
  end

  subgraph TWIN["Прод-двойник (Docker в CI)"]
    twinapp["node:23.11 · 256 МБ без swap · 1 CPU\nstart.cjs → server.js"]
    twindb[("MariaDB 10.4")]
  end

  subgraph LAB["Лаборатория — Vercel athletics-gym-lab (fra1)"]
    labedge["Edge: middleware\nrequest_id · язык · защита админки"]
    labfn["Функции Node: Next.js 15\nсайт · админка · /api/health/*\nJSON-логи · onRequestError"]
    tidb[("TiDB Cloud Starter\nFrankfurt · синтетические данные")]
    supa[("Supabase Storage\ndev-проект · Фото")]
  end

  subgraph PROD["Прод — hoster.kz (Plesk + Passenger)"]
    plesk["Plesk Git\nзабирает ветку deploy"]
    app["Node 23.11 · 256 МБ\nstart.cjs: миграции → server.js"]
    maria[("MariaDB 10.4\n127.0.0.1")]
    media[("MEDIA_DIR\nФото на диске")]
  end

  sentry["Sentry\nошибки сервера Лаборатории"]
  uptime["UptimeRobot → Telegram\n/api/health/ready Лаборатории\n(этап 5)"]
  oldv["Vercel athletics-gym\n308 → athleticsgym.kz (не трогаем)"]

  repo --> ci --> twinapp --> twindb
  repo --> labwf --> labedge --> labfn
  labfn --> tidb
  labfn --> supa
  labfn -. "SENTRY_DSN" .-> sentry
  mon --> labfn
  mon --> monbr --> pages
  uptime --> labfn
  repo -- "тег + подтверждение" --> deploywf --> deploybr --> plesk --> app
  app --> maria
  app --> media
```

## Что важно

- **Границы данных.** В Лаборатории нет персональных данных: Тренеры вымышленные, Отзывы и Обращения синтетические (ADR 0007). Внешние сервисы (Sentry, синтетика; с этапа 5 — UptimeRobot) подключены только к ней. Прод снаружи никто не опрашивает.
- **Выкатка прода** — только ветка `deploy` из ручного запуска с подтверждением. Merge в `main` до прода не доходит (ADR 0006).
- **Совместимость.** Каждый PR собирает пакет для хостинга и гоняет его в прод-двойнике с лимитами hoster.kz. Если код перестанет влезать в 256 МБ, CI станет красным раньше, чем это выяснится на проде (ADR 0005).
- **Vercel-проекты разведены**: Лаборатория выкатывается из Actions через CLI, а корневой `vercel.json` держит Git-деплои выключенными для старого проекта-редиректа (ADR 0008).
