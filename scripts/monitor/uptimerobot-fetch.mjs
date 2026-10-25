// Проверки UptimeRobot за последние часы → <папка>/data/uptimerobot/ГГГГ-ММ.jsonl (ветка monitoring, ADR 0014).
//   node scripts/monitor/uptimerobot-fetch.mjs <папка данных> [часов=72]
// Окно с запасом: если суточный запуск GitHub пропустит день, следующий доберёт пропущенное. Повторы сливаются.
import fs from "node:fs";
import path from "node:path";
import { allMonitors } from "./uptimerobot-api.mjs";
import { desiredMonitors, mergeChecks, monitorChecks } from "./uptimerobot-core.mjs";

const [dir, hoursArg] = process.argv.slice(2);
if (!dir) {
  console.error("Использование: node scripts/monitor/uptimerobot-fetch.mjs <папка данных> [часов]");
  process.exit(2);
}
const hours = Number(hoursArg ?? 72);
const toSec = Math.floor(Date.now() / 1000);
const fromSec = toSec - hours * 3600;
const desired = desiredMonitors(process.env.LAB_URL || "https://athletics-gym-lab.vercel.app");

const monitors = await allMonitors({
  response_times: "1",
  response_times_start_date: String(fromSec),
  response_times_end_date: String(toSec),
  logs: "1",
  logs_start_date: String(fromSec),
  logs_end_date: String(toSec),
});

const incoming = [];
for (const d of desired) {
  const m = monitors.find((x) => x.url === d.url);
  if (!m) {
    console.error(`Нет монитора ${d.url} — запустите uptimerobot-setup.mjs`);
    process.exitCode = 1;
    continue;
  }
  const checks = monitorChecks(m, d.target, fromSec, toSec);
  console.log(`${d.target}: ${checks.length} проверок за ${hours} ч`);
  incoming.push(...checks);
}

// По месяцам: в каждый файл — его проверки, слитые с уже записанными
const dataDir = path.join(dir, "data", "uptimerobot");
fs.mkdirSync(dataDir, { recursive: true });
for (const month of [...new Set(incoming.map((c) => c.t.slice(0, 7)))]) {
  const file = path.join(dataDir, `${month}.jsonl`);
  const existing = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
    : [];
  const merged = mergeChecks(existing, incoming.filter((c) => c.t.startsWith(month)));
  fs.writeFileSync(file, merged.map((c) => JSON.stringify(c)).join("\n") + "\n");
}
