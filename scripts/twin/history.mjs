// История прод-двойника по прогонам CI на main: RSS и задержки каждого прогона, затем медиана и разброс.
// Один прогон двойника шумит (p95 на одном и том же коде — от 233 до 465 мс), поэтому «до/после» этапа
// сравниваем медианами нескольких прогонов, а не одним числом. Нужен `gh` с доступом к репозиторию.
//
//   node scripts/twin/history.mjs                      — последние 15 прогонов
//   node scripts/twin/history.mjs --limit 30 --since 2026-11-07 --until 2026-11-09
import { execFileSync } from "node:child_process";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const limit = Number(arg("limit", 15));
const since = arg("since");
const until = arg("until");

const gh = (args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

const runs = JSON.parse(gh(["run", "list", "--workflow", "ci.yml", "--branch", "main", "--event", "push", "-L", String(limit * 2), "--json", "databaseId,headSha,createdAt,conclusion"]))
  .filter((r) => r.conclusion === "success")
  .filter((r) => (!since || r.createdAt >= since) && (!until || r.createdAt < until))
  .slice(0, limit);

const rows = [];
for (const r of runs) {
  let log = "";
  try {
    log = gh(["run", "view", String(r.databaseId), "--log"]);
  } catch {
    continue;
  }
  const rss = log.match(/RSS после запуска \/ пик \/ после холодного старта \| ([\d.]+) \/ \*\*([\d.]+)\*\*/);
  const lat = log.match(/Задержка страниц и API p50 \/ p95 \/ макс \| (\d+) \/ \*\*(\d+)\*\* \/ (\d+)/);
  if (!rss || !lat) continue;
  rows.push({ when: r.createdAt.slice(0, 16), sha: r.headSha.slice(0, 7), idle: +rss[1], peak: +rss[2], p50: +lat[1], p95: +lat[2] });
  console.log(`${r.createdAt.slice(0, 16)} ${r.headSha.slice(0, 7)}  RSS ${rss[1]} / пик ${rss[2]} МБ  p50 ${lat[1]} / p95 ${lat[2]} мс`);
}

const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  return +(s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)).toFixed(1);
};
if (rows.length === 0) {
  console.log("Нет прогонов с отчётом двойника.");
  process.exit(1);
}
console.log(`\nПрогонов: ${rows.length}`);
for (const k of ["idle", "peak", "p50", "p95"]) {
  const v = rows.map((r) => r[k]);
  console.log(`${k.padEnd(4)}  мин ${Math.min(...v)}  медиана ${q(v, 0.5)}  макс ${Math.max(...v)}`);
}
