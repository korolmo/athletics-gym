# Runbook: наблюдаемость Лаборатории

Всё ниже касается только **Лаборатории** (https://athletics-gym-lab.vercel.app). Боевой сайт athleticsgym.kz мониторингом, Sentry и внешними сервисами не охвачен (ADR 0005, 0006): его проверки — вручную после релиза (`docs/runbooks/release.md`).

## Что есть

| Сигнал | Где | Решение |
|---|---|---|
| Живость | `GET /api/health/live` → `{"status":"ok"}`, без зависимостей | — |
| Готовность | `GET /api/health/ready` → 200 `ok` / 503 `fail`; база и хранилище Фото, тайм-аут 1 с на каждую | — |
| Подробности | `GET /api/health` — только с сессией Владельца: версии, память, `release`, `accessLog`, детали готовности | — |
| Логи | stdout, одна строка JSON: `level`, `time`, `msg`, `request_id`, `route`, `method`, `status`, `duration_ms`, `release` | ADR 0009 |
| Ошибки | Sentry, только сервер, только при `SENTRY_DSN` | ADR 0010 |
| Синтетика | GitHub Actions «Monitor Lab» каждые ~5 мин → ветка `monitoring`, страница https://korolmo.github.io/athletics-gym/ | ниже |
| Алерты | Сейчас — письмо GitHub о красном «Monitor Lab» (быстрое выгорание бюджета). UptimeRobot → Telegram — на этапе 5 | ниже |
| Прод-двойник | CI job «Prod twin»: RSS ≤ 230 МБ, нет 5xx, нет OOM | ADR 0005 |

## SLO

**99,5 % проверок за 30 дней успешны; успех — HTTP 200 и полный ответ быстрее 1 с** (`/ru`, `/kk`, `/api/health/ready`). Код — `scripts/monitor/sli.mjs`.

- **Бюджет ошибок** — 0,5 % проверок окна. При 3 адресах и запуске раз в 5 минут это ~26 000 проверок и ~130 допустимых ошибок за 30 дней: около 10,8 часа простоя одного адреса или 3,6 часа — всех трёх.
- **Burn rate** — доля ошибок в окне, делённая на 0,5 %: 1 значит, что бюджет закончится ровно за 30 дней. Окна — 1 ч, 6 ч, 24 ч, 30 дней.
- **Тревога быстрого выгорания** — burn rate за час ≥ 14,4 (за час сгорает 2 % месячного бюджета) и последняя проверка неуспешна. Тогда workflow «Monitor Lab» красный, и GitHub присылает письмо.
- **Холодный старт** Vercel входит в SLI, но отдельно вынесен в ADR 0011.

## Что делать, если…

| Сигнал | Действия |
|---|---|
| `/api/health/ready` не отвечает (красный «Monitor Lab»; с этапа 5 — ещё и UptimeRobot) | 1. Открыть `/api/health/live`: если не 200 — проблема платформы или деплоя (Vercel → Deployments, статус Vercel). 2. Если live 200, то упала база или хранилище: `/api/health` под Владельцем покажет, что именно (`ready.database` / `ready.storage`). 3. TiDB Cloud → кластер (лимиты Starter: Request Units, хранилище); Supabase dev → Storage. 4. Если виноват последний деплой — Vercel → Deployments → предыдущий → **Promote to Production**. |
| «Monitor Lab» красный (быстрое выгорание) | То же, что выше; посмотреть `status.json` в ветке `monitoring`, какой адрес падает. |
| Медленно (p95 > 1 с), но 200 | Холодные старты (ADR 0011)? Логи: строки `msg: "request"` с большим `duration_ms`, группировать по `route`. TiDB Starter: задержка первого запроса после простоя. |
| Ошибка в Sentry | По `release` найти коммит; по `request_id` (заголовок ответа `X-Request-Id`) найти строку в логах Vercel. |
| Нужно проверить, что Sentry работает | Войти в админку Лаборатории → в консоли браузера `fetch("/api/health/error", { method: "POST" })` → 500, в Sentry появится «Проверка Sentry…». |
| Нужно проверить, что пишутся строки доступа | `/api/health` под Владельцем: `accessLog.requests` растёт с каждым запросом. |
| Превью PR не открывается или в нём не те данные | У каждого PR своя база `pr_<номер>` (ADR 0012): шаг «Preview database» в `lab.yml` — создание, миграции, seed. Пересобрать — новый пуш или **Re-run** запуска. Лишние базы удаляет `lab-preview-cleanup.yml` при закрытии PR, а лимит в 20 баз — при создании новой. Вручную: `LAB_DATABASE_URL=… node scripts/lab/preview-db.mjs drop <номер>`. База `athletics` (production Лаборатории) превью недоступна. |
| Прод-двойник красный в CI | Открыть артефакт `twin-report` и шаг «Measure and check»: RSS выше 230 МБ — искать, что выросло (зависимость, кэш); 5xx — логи контейнера в выводе шага. |

## Логи

- **Vercel**: проект `athletics-gym-lab` → Logs, фильтр по тексту `"request_id":"<id>"` или `"level":"error"`. CLI: `vercel logs <адрес деплоя> --json`.
- **Прод-двойник / локально**: `docker compose --profile twin logs twin-app`.
- **Хостинг** (когда код дойдёт до релиза): Plesk → Node.js → журнал приложения. Там те же строки JSON.
- В логах нет IP, cookies, заголовков, тел запросов и полей форм: поля проходят белый список, это проверяет тест `src/lib/observability/log.test.ts`.

## UptimeRobot → Telegram — отложен до этапа 5

Решение от 17 октября 2026: алерты во внешний сервис подключаем на этапе 5 («SLO-панель, алерты, постмортемы»). До этого единственная тревога — письмо GitHub, когда «Monitor Lab» падает на быстром выгорании бюджета. Инструкция ниже — для этапа 5.


1. https://uptimerobot.com → **Register** (бесплатный план).
2. **Integrations & API** → **Telegram** → **Add** → откроется бот `@UptimeRobotBot` → **Start**. Ссылка привяжет чат.
3. **Monitors** → **New monitor**:
   - Type: **HTTP(s)**;
   - Friendly name: `Athletic's Gym Lab — ready`;
   - URL: `https://athletics-gym-lab.vercel.app/api/health/ready`;
   - Interval: **5 minutes** (минимум бесплатного плана);
   - Timeout: 30 s (холодный старт не должен давать ложных тревог; задержку меряет SLO);
   - (если доступно) Advanced → **Keyword** `"status":"ok"` — тип «exists»;
   - Alert contacts: Telegram.
4. Сохранить и проверить: monitor → **Test notification**.
5. Адрес боевого сайта в UptimeRobot **не добавлять** (ADR 0006).

## Ветка monitoring

Данные — `data/ГГГГ-ММ.jsonl` (по строке на проверку: `run`, `t`, `target`, `status`, `ms`, `cache`), сводка — `status.json`, страница — `index.html`. Ветку пишет только workflow. В `main` её не сливать. Если история разрастётся, её можно пересоздать orphan-коммитом с последними двумя файлами `data/`. Расписание GitHub Actions выключается после 60 дней без активности в репозитории: тогда «Monitor Lab» → **Enable workflow**.
