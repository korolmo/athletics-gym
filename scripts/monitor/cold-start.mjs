// Холодный старт Лаборатории на Vercel (этап 0, ADR 0011): первый запрос к свежему деплою против тёплых.
//   node scripts/monitor/cold-start.mjs <адрес деплоя>
// Запускать сразу после выкатки: первый /api/health/ready поднимает новый экземпляр функции.
import { assertLabUrl } from "./sli.mjs";

const base = assertLabUrl(process.argv[2]);
const hit = async (path) => {
  const t = performance.now();
  const r = await fetch(new URL(path, base), { headers: { "cache-control": "no-cache" } });
  await r.arrayBuffer();
  return { path, status: r.status, ms: Math.round(performance.now() - t), cache: r.headers.get("x-vercel-cache") };
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const coldReady = await hit("/api/health/ready");
const coldPage = await hit("/ru");
const warm = [];
for (let i = 0; i < 7; i++) warm.push(await hit("/api/health/ready"));
const warmPage = [];
for (let i = 0; i < 5; i++) warmPage.push(await hit("/ru"));
console.log(JSON.stringify({
  base,
  coldReady,
  coldPage,
  warmReadyMedian: median(warm.map((w) => w.ms)),
  warmPageMedian: median(warmPage.map((w) => w.ms)),
  warmPageCache: warmPage.at(-1).cache,
}));
