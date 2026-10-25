// Мониторы UptimeRobot для Лаборатории (ADR 0014) — из репозитория, идемпотентно: повторный запуск ничего не меняет.
//   node --env-file=.env.lab scripts/monitor/uptimerobot-setup.mjs [--dry-run] [--check]
// --dry-run — только показать план; --check — после сверки проверить, что мониторы «up» (код 1, если нет).
// Адрес — LAB_URL или алиас Лаборатории; боевой сайт скрипт не добавит (assertLabUrl).
import { allMonitors, call } from "./uptimerobot-api.mjs";
import { desiredMonitors, monitorParams, planMonitors } from "./uptimerobot-core.mjs";

const base = process.env.LAB_URL || "https://athletics-gym-lab.vercel.app";
const dryRun = process.argv.includes("--dry-run");
const desired = desiredMonitors(base);
const plan = planMonitors(await allMonitors(), desired);

for (const m of plan.ok) console.log(`= ${m.target} — уже как нужно (id ${m.id})`);
for (const m of plan.create) console.log(`+ ${m.target} — создать: ${m.url}, тип ${m.type}, каждые ${m.interval / 60} мин`);
for (const m of plan.update) console.log(`~ ${m.target} — поправить (id ${m.id}): ${JSON.stringify(m.changes)}`);
for (const url of plan.extra) console.log(`! ${url} — монитор Лаборатории вне списка, не трогаю`);

if (!dryRun) {
  for (const m of plan.create) {
    const r = await call("newMonitor", monitorParams(m));
    console.log(`  создан ${m.target}: id ${r.monitor?.id}`);
  }
  for (const m of plan.update) {
    await call("editMonitor", { id: String(m.id), ...monitorParams(m.changes) });
    console.log(`  поправлен ${m.target}`);
  }
}

if (process.argv.includes("--check")) {
  // status: 0 — на паузе, 1 — ещё не проверялся, 2 — up, 8 — «кажется, down», 9 — down
  const names = { 0: "на паузе", 1: "ещё не проверялся", 2: "up", 8: "кажется, down", 9: "down" };
  const urls = new Set(desired.map((d) => d.url));
  const mine = (await allMonitors()).filter((m) => urls.has(m.url));
  let bad = 0;
  for (const m of mine) {
    const s = Number(m.status);
    if (s !== 2) bad++;
    console.log(`${s === 2 ? "✓" : "✗"} ${m.url} — ${names[s] ?? s}`);
  }
  if (mine.length !== desired.length) bad++;
  // Страница отвечает, а монитор down — вероятно, перевёрнут смысл keyword_type: проверить вручную в UptimeRobot
  if (bad) process.exitCode = 1;
}
