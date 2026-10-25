// Отчёт мониторинга Лаборатории (ADR 0014): SLI, бюджет ошибок, burn rate, холодный старт → status.json и index.html
// (GitHub Pages, ветка monitoring).
//   node scripts/monitor/report.mjs <папка данных>
// Данные: data/uptimerobot/*.jsonl (uptimerobot-fetch.mjs), data/cold-start.jsonl (lab.yml после выкатки).
// Код выхода 1 — сработала тревога (выгорание, мало проверок, данные устарели): GitHub пришлёт письмо о падении workflow.

import fs from "node:fs";
import path from "node:path";
import { SLO, TARGETS, summarize } from "./sli.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("Использование: node scripts/monitor/report.mjs <папка данных>");
  process.exit(2);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const rows = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      // повреждённую строку пропускаем
    }
  }
  return rows;
}

// Окно SLO — 30 дней: хватает файлов за этот и прошлый месяц. data/ГГГГ-ММ.jsonl в корне — прежняя синтетика
// GitHub Actions (до 25 октября 2026): её измерение невалидно (ADR 0014), в отчёт она не входит
const urDir = path.join(dir, "data", "uptimerobot");
const checks = fs.existsSync(urDir)
  ? fs.readdirSync(urDir).filter((f) => f.endsWith(".jsonl")).sort().slice(-2).flatMap((f) => readJsonl(path.join(urDir, f)))
  : [];
const coldStarts = readJsonl(path.join(dir, "data", "cold-start.jsonl"));

const s = summarize(checks, Date.now(), coldStarts);
fs.writeFileSync(path.join(dir, "status.json"), JSON.stringify(s, null, 2) + "\n");

const pct = (x, d = 2) => (x === null || x === undefined ? "—" : `${(x * 100).toFixed(d).replace(".", ",")} %`);
const ms = (x) => (x === null || x === undefined ? "—" : `${x} мс`);
const num = (x) => (x === null || x === undefined ? "—" : x.toFixed(2).replace(".", ","));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const reasons = [];
if (s.alerts.fastBurn.firing) reasons.push(`быстрое выгорание бюджета: burn за час до ${num(s.alerts.fastBurn.worst)} (порог 14,4)`);
if (s.alerts.slowBurn.firing) reasons.push(`медленное выгорание: burn за 6 часов до ${num(s.alerts.slowBurn.worst)} (порог 6)`);
if (s.alerts.lowCoverage.firing) {
  reasons.push(`мало проверок за сутки: ${s.alerts.lowCoverage.targets.map((x) => `${x.target} — ${x.checks}`).join(", ")} (нужно ≥ ${s.alerts.lowCoverage.min})`);
}
if (s.alerts.stale.firing) reasons.push(`последняя проверка ${s.alerts.stale.ageMin === null ? "— нет данных" : `${s.alerts.stale.ageMin} мин назад`} (допустимо ${s.alerts.stale.maxAgeMin})`);

const met = s.overall.availability === null || s.overall.availability >= SLO.target;
const state = s.alerting ? ["bad", "Тревога"] : met ? ["ok", "SLO выполняется"] : ["warn", "SLO нарушен"];

const rows = TARGETS.map((t) => {
  const b = s.byTarget[t];
  const last = b.last ? `${b.last.status || "сбой"}${b.last.ms === null ? "" : `, ${b.last.ms} мс`}` : "—";
  return `<tr><td><code>${esc(t)}</code></td><td>${b.slo ? "SLO" : "диагностика"}</td><td>${pct(b.availability)}</td><td>${ms(b.p50)}</td><td>${ms(b.p95)}</td><td>${b.lastDay}</td><td>${esc(last)}</td></tr>`;
}).join("");
const cs = s.coldStart;

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
ul.alerts { margin:16px 0 0; padding-left:20px; color:var(--bad); }
p.note, p.stale { color:var(--muted); font-size:.875rem; margin-top:24px; }
p.stale { color:var(--bad); font-weight:600; }
a { color:inherit; }
</style>
</head>
<body>
<main>
<h1>Лаборатория Athletic's Gym — статус</h1>
<p class="sub">Проверки UptimeRobot каждые 5 минут: страницы <code>/ru</code> и <code>/kk</code> (SLO), <code>/api/health/ready</code> (диагностика). Пересчёт раз в сутки, обновлено <span id="gen">${esc(s.generatedAt.replace("T", " ").slice(0, 16))}</span> UTC.</p>
<p class="stale" id="stale" hidden>Данные старше 36 часов: суточный пересчёт не запускался.</p>
<span class="state"><span class="dot"></span>${state[1]}</span>
${reasons.length ? `<ul class="alerts">${reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
<div class="grid">
<div class="card"><span>Доступность страниц за 30 дней</span><b>${pct(s.overall.availability, 3)}</b><span>SLO ${pct(SLO.target, 1)}: ответ 200 со страницей быстрее ${SLO.latencyMs} мс</span></div>
<div class="card"><span>Остаток бюджета ошибок</span><b>${pct(Math.max(-1, s.budget.remaining), 1)}</b><span>ошибок ${s.budget.errors} из допустимых ${num(s.budget.allowedErrors)}</span></div>
<div class="card"><span>Задержка p50 / p95</span><b>${ms(s.overall.p50)} / ${ms(s.overall.p95)}</b><span>страницы, успешные ответы</span></div>
<div class="card"><span>Burn rate 1 ч / 6 ч / 24 ч</span><b>${num(s.burn["1h"])} / ${num(s.burn["6h"])} / ${num(s.burn["24h"])}</b><span>1 — бюджет кончится ровно за 30 дней</span></div>
<div class="card"><span>Холодный старт (после выкаток)</span><b>${pct(cs.share, 0)}</b><span>${cs.good} из ${cs.cold} быстрее ${cs.latencyMs} мс, цель ${pct(cs.target, 0)}; p50 ${ms(cs.p50)}</span></div>
</div>
<div class="table"><table>
<thead><tr><th>Адрес</th><th>Роль</th><th>Доступность</th><th>p50</th><th>p95</th><th>За сутки</th><th>Последняя</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
<p class="note">Проверок страниц за окно: ${s.overall.total}. Опрос раз в 5 минут сам держит функцию Vercel тёплой, поэтому холодный старт меряется отдельно — сразу после выкатки, по заголовку <code>X-Cold-Start</code>. Синтетика GitHub Actions до 25 октября 2026 в расчёт не входит: cron запускался в 40 раз реже плана, измерение невалидно (ADR 0014). Это демо-стенд с синтетическими данными; боевой сайт клиента здесь не проверяется. Данные — <a href="status.json">status.json</a> и <code>data/</code> в ветке <code>monitoring</code>.</p>
</main>
<script>
// Суточный пересчёт может не запуститься (cron GitHub) — тогда страница сама скажет, что данные старые
(function () {
  var gen = Date.parse(${JSON.stringify(s.generatedAt)});
  if (Date.now() - gen > 36 * 3600 * 1000) document.getElementById("stale").hidden = false;
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, "index.html"), html);
fs.writeFileSync(path.join(dir, ".nojekyll"), "");

const line = `Доступность страниц 30 д: ${pct(s.overall.availability, 3)} (проверок ${s.overall.total}), бюджет: ${pct(s.budget.remaining, 1)}, p95 ${ms(s.overall.p95)}, burn 24h ${num(s.burn["24h"])}; холодный старт: ${cs.good} из ${cs.cold}`;
console.log(line);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n${reasons.map((r) => `- ${r}`).join("\n")}\n`);
if (s.alerting) {
  for (const r of reasons) console.error(`Тревога: ${r}`);
  process.exitCode = 1;
}
