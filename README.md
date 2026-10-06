# Athletic's Gym — сайт и админка

Прототип для питча: публичный сайт зала (RU/KZ) и админка, где Администратор меняет Тарифы с телефона.
Термины — в [GLOSSARY.md](./GLOSSARY.md), решения — в [docs/adr](./docs/adr).

**Стек:** Next.js 15 (App Router, TypeScript) · Tailwind CSS 4 · PostgreSQL (Supabase) · Prisma 6.

## Что есть

- `/ru`, `/kk` — одностраничный сайт: первый экран, о зале, женский зал, направления, цены (из базы), тренеры (демо), расписание (демо), рейтинг 2ГИС, контакты с картой. Все кнопки ведут в WhatsApp зала.
- `/admin` — вход по логину и паролю из `.env`, список Тарифов по Категориям, добавление, редактирование, скрытие и удаление. Изменения сразу видны на сайте.
- Тренеры и Расписание в админке — следующий этап (сейчас только демо-данные из seed).

## Запуск на своём компьютере (Windows, PowerShell)

Нужен Node.js 20+ (`node -v`).

1. **База данных — Supabase.** Зарегистрируйтесь на https://supabase.com → **New project**: имя `athletics-gym`, придумайте и сохраните **Database Password**, регион — ближайший (например, Frankfurt / eu-central-1).
2. В проекте нажмите **Connect** (вверху) → вкладка **ORMs** → **Prisma**. Скопируйте `DATABASE_URL` и `DIRECT_URL` в файл `.env`, заменив `[YOUR-PASSWORD]` на пароль базы. Логин и пароль админки — там же (`ADMIN_LOGIN`, `ADMIN_PASSWORD`).
3. В папке проекта:

   ```powershell
   npm install
   npm run db:push
   npm run seed
   npm run dev
   ```

4. Откройте http://localhost:3000 (сайт) и http://localhost:3000/admin (админка).

Если какая-то команда упала — пришлите её вывод целиком.

## Деплой на Vercel (ссылка для владельца)

1. Создайте пустой **публичный** репозиторий на GitHub (без README) и запушьте проект:

   ```powershell
   git init
   git add .
   git commit -m "Athletic's Gym: сайт и админка тарифов"
   git branch -M main
   git remote add origin https://github.com/<ваш-логин>/athletics-gym.git
   git push -u origin main
   ```

   Файл `.env` в репозиторий не попадёт (он в `.gitignore`) — секреты остаются у вас.
2. На https://vercel.com → **Add New → Project** → импортируйте репозиторий.
3. В **Environment Variables** добавьте те же 5 переменных из `.env`: `DATABASE_URL`, `DIRECT_URL`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `AUTH_SECRET`.
4. **Deploy**. База уже заполнена с вашего компьютера, повторно seed не нужен.

> Бесплатный проект Supabase засыпает после 7 дней без запросов. Перед встречей откройте сайт, а если проект на паузе — нажмите **Restore** в панели Supabase.

## Что попросить у владельца после показа

- Исходники логотипов (сейчас — скриншоты низкого разрешения в `public/`).
- Полный прайс, расписание групповых занятий, список тренеров с фото и согласием.
- Фото зала (свои или разрешение на их фото).
- Проверку казахских текстов носителем языка (`src/dictionaries/kk.ts`).

## Структура

```
prisma/schema.prisma        модель данных (Тариф, Направление, Тренер, Занятие)
prisma/seed.ts              реальные цены + демо-тренеры и демо-расписание
src/app/[locale]/           публичный сайт
src/app/admin/              админка (вход, Тарифы)
src/components/site/        блоки главной страницы
src/dictionaries/           тексты RU и KZ
src/lib/                    база, авторизация, языки, данные зала
src/middleware.ts           / → /ru или /kk (запоминает выбор языка)
```
