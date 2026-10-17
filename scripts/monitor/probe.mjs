// Синтетическая проверка Лаборатории (этап 0): /ru, /kk, /api/health/ready — статус и время полного ответа.
// Дописывает строки JSON в <папка>/data/ГГГГ-ММ.jsonl (ветка monitoring, не main).
//   node scripts/monitor/probe.mjs https://athletics-gym-lab.vercel.app <папка>
// Боевой сайт не проверяем (assertLabUrl).

import fs from "node:fs";
import path from "node:path";
import { TARGETS, assertLabUrl } from "./sli.mjs";

const [base, dir] = process.argv.slice(2);
if (!base || !dir) {
  console.error("Использование: node scripts/monitor/probe.mjs <адрес Лаборатории> <папка данных>");
  process.exit(2);
}
assertLabUrl(base);

const run = new Date().toISOString();

async function check(target) {
  const started = performance.now();
  try {
    const r = await fetch(new URL(target, base), {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "athletics-lab-monitor/1.0 (GitHub Actions)", "cache-control": "no-cache" },
    });
    await r.arrayBuffer();
    return { run, t: new Date().toISOString(), target, status: r.status, ms: Math.round(performance.now() - started), cache: r.headers.get("x-vercel-cache") ?? undefined };
  } catch (e) {
    return { run, t: new Date().toISOString(), target, status: 0, ms: Math.round(performance.now() - started), error: e instanceof Error ? e.name : "error" };
  }
}

// По очереди: первая проверка может попасть на холодный старт, и это часть SLI
const checks = [];
for (const target of TARGETS) checks.push(await check(target));

const file = path.join(dir, "data", `${run.slice(0, 7)}.jsonl`);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.appendFileSync(file, checks.map((c) => JSON.stringify(c)).join("\n") + "\n");
for (const c of checks) console.log(`${c.target}: ${c.status || c.error} за ${c.ms} мс`);
