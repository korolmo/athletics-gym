// Отчёт мониторинга Лаборатории: SLI, бюджет ошибок, burn rate → status.json и index.html (GitHub Pages, ветка monitoring).
//   node scripts/monitor/report.mjs <папка данных>
// Код выхода 1 — тревога быстрого выгорания бюджета (GitHub пришлёт письмо о падении workflow).

import fs from "node:fs";
import path from "node:path";
import { SLO, TARGETS, summarize } from "./sli.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("Использование: node scripts/monitor/report.mjs <папка данных>");
  process.exit(2);
}

const dataDir = path.join(dir, "data");
const checks = [];
if (fs.existsSync(dataDir)) {
  // Окно SLO — 30 дней: хватает файлов за этот и прошлый месяц
  for (const name of fs.readdirSync(dataDir).filter((f) => f.endsWith(".jsonl")).sort().slice(-2)) {
    for (const line of fs.readFileSync(path.join(dataDir, name), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        checks.push(JSON.parse(line));
      } catch {
        // повреждённую строку пропускаем
      }
    }
  }
}

const s = summarize(checks);
fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify(s, null, 2) + "\n");

const pct = (x, d = 2) => (x === null || x === undefined ? "—" : `${(x * 100).toFixed(d).replace(".", ",")} %`);
const ms = (x) => (x === null || x === undefined ? "—" : `${x} мс`);
const num = (x) => (x === null || x === undefined ? "—" : x.toFixed(2).replace(".", ","));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const met = s.overall.availability === null || s.overall.availability >= SLO.target;
const state = s.fastBurnAlert ? ["bad", "Быстрое выгорание бюджета"] : met ? ["ok", "SLO выполняется"] : ["warn", "SLO нарушен"];

const rows = TARGETS.map((t) => {
  const b = s.byTarget[t];
  const last = b.last ? `${b.last.status || "нет ответа"}, ${b.last.ms} мс` : "—";
  return `<tr><td><code>${esc(t)}</code></td><td>${pct(b.availability)}</td><td>${ms(b.p50)}</td><td>${ms(b.p95)}</td><td>${b.total}</td><td>${esc(last)}</td></tr>`;
}).join("");

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Статус Лаборатории</title>
<style>
:root { --bg:#f6f6f4; --fg:#18181b; --muted:#52525b; --card:#fff; --line:#e4e4e7; --ok:#15803d; --warn:#a16207; --bad:#b91c1c; }
@media (prefers-color-scheme: dark) { :root { --bg:#131315; --fg:#f4f4f5; --muted:#a1a1aa; --card:#1c1c1f; --line:#2e2e33; --ok:#4ade80; --warn:#facc15; --bad:#f87171; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width:860px; margin:0 auto; padding:32px 16px 48px; }
h1 { font-size:1.6rem; margin:0 0 4px; }
.sub { color:var(--muted); margin:0 0 24px; }
.state { display:inline-flex; align-items:center; gap:8px; font-weight:600; padding:6px 12px; border-radius:999px; border:1px solid var(--line); background:var(--card); }
.dot { width:10px; height:10px; border-radius:50%; background:var(--${state[0]}); }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:24px 0; }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; }
.card b { display:block; font-size:1.5rem; font-variant-numeric:tabular-nums; }
.card span { color:var(--muted); font-size:.875rem; }
.table { overflow-x:auto; }
table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:12px; font-variant-numeric:tabular-nums; }
th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); white-space:nowrap; }
th { color:var(--muted); font-weight:500; font-size:.875rem; }
tr:last-child td { border-bottom:0; }
p.note { color:var(--muted); font-size:.875rem; margin-top:24px; }
a { color:inherit; }
</style>
</head>
<body>
<main>
<h1>Лаборатория Athletic's Gym — статус</h1>
<p class="sub">Синтетические проверки каждые ~5 минут из GitHub Actions: <code>/ru</code>, <code>/kk</code>, <code>/api/health/ready</code>. Обновлено ${esc(s.generatedAt.replace("T", " ").slice(0, 16))} UTC.</p>
<span class="state"><span class="dot"></span>${state[1]}</span>
<div class="grid">
<div class="card"><span>Доступность за 30 дней</span><b>${pct(s.overall.availability, 3)}</b><span>SLO ${pct(SLO.target, 1)}, ответ 200 быстрее ${SLO.latencyMs} мс</span></div>
<div class="card"><span>Остаток бюджета ошибок</span><b>${pct(Math.max(-1, s.budget.remaining), 1)}</b><span>ошибок ${s.budget.errors} из допустимых ${num(s.budget.allowedErrors)}</span></div>
<div class="card"><span>Задержка p50 / p95</span><b>${ms(s.overall.p50)} / ${ms(s.overall.p95)}</b><span>успешные ответы, полное тело</span></div>
<div class="card"><span>Burn rate 1 ч / 6 ч / 24 ч</span><b>${num(s.burn["1h"])} / ${num(s.burn["6h"])} / ${num(s.burn["24h"])}</b><span>1 — бюджет кончится ровно за 30 дней</span></div>
</div>
<div class="table"><table>
<thead><tr><th>Адрес</th><th>Доступность</th><th>p50</th><th>p95</th><th>Проверок</th><th>Последняя</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
<p class="note">Проверок за окно: ${s.overall.total}. Это демо-стенд с синтетическими данными; боевой сайт клиента здесь не проверяется. Данные — <a href="status.json">status.json</a> и <code>data/*.jsonl</code> в ветке <code>monitoring</code>.</p>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, "index.html"), html);
fs.writeFileSync(path.join(dir, ".nojekyll"), "");

const line = `Доступность 30 д: ${pct(s.overall.availability, 3)} (проверок ${s.overall.total}), бюджет: ${pct(s.budget.remaining, 1)}, p95 ${ms(s.overall.p95)}, burn 1h ${num(s.burn["1h"])}`;
console.log(line);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
if (s.fastBurnAlert) {
  console.error(`Тревога: быстрое выгорание бюджета ошибок (burn 1h ≥ 14,4) и последняя проверка неуспешна.`);
  process.exitCode = 1;
}
