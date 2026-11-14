// Зонд кэша страниц Лаборатории (постмортем 2026-11-13, гипотеза 1): почему /ru и /kk иногда отвечают 1–4 с.
// Раз в `интервал` секунд запрашивает страницы и пишет строку JSON: время до первого байта и полное, X-Vercel-Cache,
// Age, регион (X-Vercel-Id). Медленные ответы с MISS — промах кэша и отрисовка; с HIT — сеть или CDN.
//   node scripts/monitor/cache-probe.mjs [минут=120] [интервал_с=30] > probe.jsonl
// Только Лаборатория (assertLabUrl): боевой сайт и его редирект зонд не трогает.
import { assertLabUrl } from "./sli.mjs";

const BASE = "https://athletics-gym-lab.vercel.app";
assertLabUrl(BASE);
const minutes = Number(process.argv[2] ?? 120);
const intervalSec = Number(process.argv[3] ?? 30);
const PAGES = ["/ru", "/kk"];

async function probe(path) {
  const t0 = performance.now();
  try {
    const r = await fetch(BASE + path, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: { "cache-control": "no-cache" } });
    const ttfb = performance.now() - t0;
    await r.arrayBuffer();
    return {
      t: new Date().toISOString(),
      path,
      status: r.status,
      ttfbMs: Math.round(ttfb),
      totalMs: Math.round(performance.now() - t0),
      cache: r.headers.get("x-vercel-cache"),
      age: r.headers.get("age") === null ? null : Number(r.headers.get("age")),
      region: (r.headers.get("x-vercel-id") ?? "").split("::").slice(0, 2).join("::"),
    };
  } catch (e) {
    return { t: new Date().toISOString(), path, status: null, error: e instanceof Error ? e.name : String(e) };
  }
}

const end = Date.now() + minutes * 60_000;
while (Date.now() < end) {
  for (const p of PAGES) console.log(JSON.stringify(await probe(p)));
  await new Promise((r) => setTimeout(r, intervalSec * 1000));
}
