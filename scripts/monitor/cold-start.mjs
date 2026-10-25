// Холодный старт Лаборатории на Vercel (ADR 0011, 0014): первый запрос к свежему деплою против тёплых.
//   node scripts/monitor/cold-start.mjs <адрес деплоя> [--out <файл .jsonl>]
// Запускать сразу после выкатки: первый /api/health/ready поднимает новый экземпляр функции. Холодный ли он на самом
// деле, говорит заголовок X-Cold-Start (1 — первый запрос экземпляра). --out дописывает строку для SLI холодного старта.
import fs from "node:fs";
import { assertLabUrl } from "./sli.mjs";

const base = assertLabUrl(process.argv[2]);
const outIdx = process.argv.indexOf("--out");
const out = outIdx > 0 ? process.argv[outIdx + 1] : null;

const hit = async (path) => {
  const t = performance.now();
  const r = await fetch(new URL(path, base), { headers: { "cache-control": "no-cache" } });
  await r.arrayBuffer();
  return {
    path,
    status: r.status,
    ms: Math.round(performance.now() - t),
    cache: r.headers.get("x-vercel-cache"),
    coldStart: r.headers.get("x-cold-start"),
  };
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const t = new Date().toISOString();
const coldReady = await hit("/api/health/ready");
const coldPage = await hit("/ru");
const warm = [];
for (let i = 0; i < 7; i++) warm.push(await hit("/api/health/ready"));
const warmPage = [];
for (let i = 0; i < 5; i++) warmPage.push(await hit("/ru"));
const result = {
  base,
  coldReady,
  coldPage,
  warmReadyMedian: median(warm.map((w) => w.ms)),
  // Тёплые запросы с X-Cold-Start: 1 — Vercel поднял ещё один экземпляр
  warmColdStarts: warm.filter((w) => w.coldStart === "1").length,
  warmPageMedian: median(warmPage.map((w) => w.ms)),
  warmPageCache: warmPage.at(-1).cache,
};
console.log(JSON.stringify(result));
if (out) {
  const row = { t, release: process.env.RELEASE ?? null, status: coldReady.status, ms: coldReady.ms, coldStart: coldReady.coldStart, warmMs: result.warmReadyMedian };
  fs.appendFileSync(out, JSON.stringify(row) + "\n");
}
