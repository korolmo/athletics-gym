// Прод-двойник (ADR 0005): docker compose --profile twin — сервер из dist/hosting в контейнере с лимитами
// hoster.kz «Эконом-1» (256 МБ без подкачки, 1 CPU, Node 23.11, запуск через start.cjs) и MariaDB 10.4.
// Скрипт поднимает двойник с чистой базой, наполняет её seed, обходит сайт и админку и снимает:
// RSS процесса Node в контейнере, задержки p50/p95, холодный старт (остановка → первый ответ /ru).
//
//   npm run build && node scripts/standalone/assemble.mjs
//   npm run twin:measure              — замер: отчёт в консоль и dist/twin-report.json
//   npm run twin:measure -- --check   — то же, но код выхода 1, если RSS > 230 МБ, есть 5xx, сбои или OOM
//
// Параметры: ROUNDS (8), CONCURRENCY (4), COLD_STARTS (3), KEEP=1 — оставить двойник запущенным.

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { SESSION_COOKIE, signSession } from "../../src/lib/auth/session";

const CHECK = process.argv.includes("--check");
const ROUNDS = Number(process.env.ROUNDS ?? 8);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4);
const COLD_STARTS = Number(process.env.COLD_STARTS ?? 3);
const RSS_LIMIT_MB = 230;
const BASE = "http://127.0.0.1:3300";
// Должны совпадать с docker-compose.yml (сервисы twin-db и twin-app)
const DB_URL = "mysql://root:twin@127.0.0.1:3308/athletics";
const AUTH_SECRET = "twin-auth-secret-only-for-local-docker-0000";
const MB = 1024 * 1024;
const APP = path.resolve("dist", "hosting");
const REPORT = path.resolve("dist", "twin-report.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function compose(args: string[], quiet = true) {
  const r = spawnSync("docker", ["compose", "--profile", "twin", ...args], { encoding: "utf8", stdio: quiet ? "pipe" : "inherit" });
  if (r.status !== 0) throw new Error(`docker compose ${args.join(" ")}: ${(r.stderr || "").trim().split("\n").slice(-5).join("\n")}`);
  return (r.stdout || "").trim();
}

const containerId = () => compose(["ps", "-q", "twin-app"]);

/** Ждёт первого успешного ответа; возвращает миллисекунды от t0. */
async function waitFor(url: string, t0: number, timeoutMs = 120_000): Promise<number> {
  while (performance.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(`${BASE}${url}`, { signal: AbortSignal.timeout(2000) });
      await r.arrayBuffer();
      if (r.ok) return performance.now() - t0;
    } catch {
      // ещё не поднялся
    }
    await sleep(100);
  }
  throw new Error(`${url} не ответил за ${timeoutMs / 1000} с`);
}

/** RSS процесса Node (PID 1 в контейнере: node start.cjs, сервер Next — в том же процессе) раз в 500 мс. */
function watchRss(onSample: (bytes: number) => void): () => void {
  const ps = spawn("docker", ["exec", containerId(), "sh", "-c", "while true; do grep VmRSS /proc/1/status; sleep 0.5; done"]);
  ps.stdout.on("data", (d) => {
    for (const m of String(d).matchAll(/VmRSS:\s+(\d+) kB/g)) onSample(Number(m[1]) * 1024);
  });
  return () => ps.kill();
}

type Hit = { url: string; status: number; ms: number; kind: "page" | "asset" };

async function hit(url: string, kind: Hit["kind"], init?: RequestInit): Promise<Hit> {
  const t = performance.now();
  try {
    const r = await fetch(`${BASE}${url}`, { redirect: "manual", signal: AbortSignal.timeout(15_000), ...init });
    await r.arrayBuffer();
    return { url, status: r.status, ms: performance.now() - t, kind };
  } catch {
    // Обрыв соединения (например, процесс убит за память) считаем сбоем, как 5xx
    return { url, status: 0, ms: performance.now() - t, kind };
  }
}

async function pool<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) out.push(await fn(items[i++]));
    }),
  );
  return out;
}

function assetsOf(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="(\/(?:_next\/static|_img)\/[^"]+)"/g)) urls.add(m[1].replace(/&amp;/g, "&"));
  return [...urls];
}

const pct = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((sorted.length * p) / 100) - 1)] : 0);
const median = (xs: number[]) => pct([...xs].sort((a, b) => a - b), 50);

/** Seed и аккаунт Владельца в одноразовой базе двойника; cookie сессии — для страниц админки. */
async function prepareData(): Promise<string> {
  const seed = spawnSync(process.execPath, [path.resolve("node_modules", "tsx", "dist", "cli.mjs"), "prisma/seed.ts"], {
    env: { ...process.env, DATABASE_URL: DB_URL, APP_ENV: "" },
    encoding: "utf8",
  });
  if (seed.status !== 0) throw new Error(`seed: ${seed.stderr}`);
  const db = new PrismaClient({ datasourceUrl: DB_URL });
  try {
    const passwordHash = await hashPassword(crypto.randomBytes(18).toString("base64url"), 4);
    const owner = await db.owner.upsert({ where: { id: "owner" }, update: {}, create: { id: "owner", login: "twin", passwordHash } });
    return `${SESSION_COOKIE}=${await signSession(AUTH_SECRET, { version: owner.sessionVersion, expiresAt: Date.now() + 3600_000 })}`;
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  if (!fs.existsSync(path.join(APP, "start.cjs"))) throw new Error("Нет dist/hosting — сначала npm run build && node scripts/standalone/assemble.mjs");

  console.log("Двойник: чистый запуск…");
  compose(["down", "-v", "--remove-orphans"]);
  compose(["up", "-d", "--wait", "twin-db"]);
  // Первый запуск: start.cjs применяет миграции к пустой базе, потом поднимает сервер
  const t0 = performance.now();
  compose(["up", "-d", "--no-deps", "twin-app"]);
  const firstBootMs = await waitFor("/api/health/live", t0);
  const cookie = await prepareData();

  const samples: number[] = [];
  let stopWatch = watchRss((b) => samples.push(b));
  await sleep(2000);
  const idleRss = samples.length ? samples[samples.length - 1] : 0;

  const pages = ["/ru", "/kk", "/ru/privacy", "/kk/privacy", "/ru/terms", "/kk/terms", "/robots.txt", "/sitemap.xml", "/api/health/live", "/api/health/ready", "/ru/opengraph-image", "/kk/opengraph-image"];
  const admin = ["/admin", "/admin/site", "/admin/tariffs", "/admin/trainers", "/admin/reviews", "/admin/directions", "/admin/photos", "/admin/account", "/api/health"];
  const assets = new Set<string>();
  for (const p of ["/ru", "/kk"]) for (const a of assetsOf(await (await fetch(`${BASE}${p}`)).text())) assets.add(a);
  const auth = { headers: { cookie } };
  const contact = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: "whatsapp", source: "hero", locale: "ru" }) };

  const round = async () => [
    ...(await pool(pages, (p) => hit(p, "page"))),
    ...(await pool(admin, (p) => hit(p, "page", auth))),
    ...(await pool(Array.from({ length: 5 }), () => hit("/api/contact", "page", contact))),
    ...(await pool([...assets], (a) => hit(a, "asset"))),
  ];

  // Прогрев: первый рендер каждой страницы (кэш пуст) — в RSS и 5xx входит, в задержки нет
  const warm = await round();
  const hits: Hit[] = [];
  for (let r = 1; r <= ROUNDS; r++) {
    hits.push(...(await round()));
    process.stdout.write(`круг ${r}/${ROUNDS}: RSS ${(Math.max(...samples) / MB).toFixed(0)} МБ\n`);
  }
  stopWatch();
  const peakRss = Math.max(...samples);

  // Холодный старт: процесс остановлен (как Passenger, усыпивший приложение) → запуск → первый ответ /ru
  const cold: { readyMs: number; firstPageMs: number }[] = [];
  for (let i = 0; i < COLD_STARTS; i++) {
    compose(["stop", "twin-app"]);
    const t = performance.now();
    compose(["start", "twin-app"]);
    const readyMs = await waitFor("/api/health/live", t);
    const r = await hit("/ru", "page");
    cold.push({ readyMs, firstPageMs: performance.now() - t });
    if (r.status >= 500 || r.status === 0) hits.push(r);
  }
  // RSS сразу после холодного старта и первого /ru
  const afterCold: number[] = [];
  stopWatch = watchRss((b) => afterCold.push(b));
  await sleep(1500);
  stopWatch();

  const inspect = spawnSync("docker", ["inspect", "-f", "{{.State.OOMKilled}} {{.RestartCount}}", containerId()], { encoding: "utf8" }).stdout.trim();
  const oomKilled = inspect.startsWith("true");

  const pageMs = hits.filter((h) => h.kind === "page").map((h) => h.ms).sort((a, b) => a - b);
  const failures = [...warm, ...hits].filter((h) => h.status >= 500 || h.status === 0);
  const report = {
    date: new Date().toISOString(),
    platform: "docker: node:23.11.0-bookworm-slim, 256 МБ без подкачки, 1 CPU, MariaDB 10.4, NODE_OPTIONS=--max-old-space-size=160",
    requests: warm.length + hits.length,
    rounds: ROUNDS,
    concurrency: CONCURRENCY,
    rssMb: { idle: +(idleRss / MB).toFixed(1), peak: +(peakRss / MB).toFixed(1), afterColdStart: +(Math.max(0, ...afterCold) / MB).toFixed(1), limit: RSS_LIMIT_MB },
    latencyMs: { p50: Math.round(pct(pageMs, 50)), p95: Math.round(pct(pageMs, 95)), max: Math.round(pageMs[pageMs.length - 1] ?? 0) },
    coldStartMs: {
      firstBootWithMigrations: Math.round(firstBootMs),
      readyMedian: Math.round(median(cold.map((c) => c.readyMs))),
      firstPageMedian: Math.round(median(cold.map((c) => c.firstPageMs))),
      runs: cold.map((c) => ({ ready: Math.round(c.readyMs), firstPage: Math.round(c.firstPageMs) })),
    },
    failures: [...new Set(failures.map((f) => `${f.url} → ${f.status || "обрыв"}`))],
    oomKilled,
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  const lines = [
    "### Прод-двойник",
    "",
    "| Метрика | Значение |",
    "|---|---|",
    `| RSS после запуска / пик / после холодного старта | ${report.rssMb.idle} / **${report.rssMb.peak}** / ${report.rssMb.afterColdStart} МБ (порог ${RSS_LIMIT_MB}) |`,
    `| Задержка страниц и API p50 / p95 / макс | ${report.latencyMs.p50} / **${report.latencyMs.p95}** / ${report.latencyMs.max} мс |`,
    `| Холодный старт: готов / первый /ru (медиана из ${COLD_STARTS}) | ${report.coldStartMs.readyMedian} / **${report.coldStartMs.firstPageMedian}** мс |`,
    `| Первый запуск с миграциями | ${report.coldStartMs.firstBootWithMigrations} мс |`,
    `| Запросов / 5xx и обрывы / OOM | ${report.requests} / ${report.failures.length} / ${oomKilled ? "да" : "нет"} |`,
  ];
  console.log(`\n${lines.join("\n")}`);
  if (report.failures.length) console.log("Сбои:", report.failures.slice(0, 20));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);

  const problems = [
    peakRss / MB > RSS_LIMIT_MB && `RSS ${report.rssMb.peak} МБ > ${RSS_LIMIT_MB} МБ`,
    report.failures.length > 0 && `5xx/обрывы: ${report.failures.length}`,
    oomKilled && "контейнер убит за превышение памяти",
  ].filter(Boolean);
  if (CHECK && problems.length) {
    console.error(`\nПроверка двойника не пройдена: ${problems.join("; ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("Замер двойника не удался:", e instanceof Error ? e.message : e);
    try {
      console.error(compose(["logs", "--tail", "40", "twin-app"]));
    } catch {
      // логов нет
    }
    process.exitCode = 1;
  })
  .finally(() => {
    if (process.env.KEEP !== "1") {
      try {
        compose(["down", "-v", "--remove-orphans"]);
      } catch {
        // уже остановлен
      }
    }
  });
