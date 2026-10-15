# Редирект athletics-gym.vercel.app → athleticsgym.kz

Выкатывается в проект Vercel `athletics-gym` при переключении на hoster.kz (docs/hosting-plesk.md, «Переключение», шаг 4):

```powershell
cd ops/vercel-redirect
npx vercel link      # один раз: проект athletics-gym
npx vercel deploy --prod
```

Любой адрес `athletics-gym.vercel.app/<путь>` постоянно (308) ведёт на `https://athleticsgym.kz/<путь>`. Откат — Promote прежнего деплоя сайта в Vercel → Deployments.
