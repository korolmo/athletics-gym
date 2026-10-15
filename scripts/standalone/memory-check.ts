// Замер памяти собранного приложения под нагрузкой (этап 8, ADR 0004): хостинг даёт 256 МБ на весь процесс.
// Запускает dist/hosting/start.cjs так же, как Plesk (NODE_ENV=production, NODE_OPTIONS=--max-old-space-size=160),
// и гоняет по кругу: все страницы сайта и документы, картинки, превью ссылок, счётчик Обращений,
// страницы админки с сессией Владельца, загрузку Фото на диск и их раздачу. Память снимает снаружи (RSS процесса)
// и изнутри (/api/health). Фото пишутся во временную папку и удаляются после замера.
//
// Запуск: npm run build && node scripts/standalone/assemble.mjs && npm run memory:check
// База — DATABASE_URL из окружения или .env (нужен аккаунт Владельца: импорт дампа или первый вход в админку).
// Параметры: ROUNDS (по умолчанию 12), CONCURRENCY (4), PORT (3200).
// DOCKER_IMAGE=node:23-bookworm-slim — запустить сервер в Linux-контейнере с жёстким лимитом памяти, как на хостинге
// (DOCKER_MEMORY, по умолчанию 256m, без подкачки); память — RSS процесса Node внутри контейнера.

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import sharp from "sharp";
import { SESSION_COOKIE, signSession } from "../../src/lib/auth/session";

const APP = path.resolve("dist", "hosting");
const PORT = Number(process.env.PORT ?? 3200);
const BASE = `http://127.0.0.1:${PORT}`;
const ROUNDS = Number(process.env.ROUNDS ?? 12);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4);
const MB = 1024 * 1024;
const DOCKER_IMAGE = process.env.DOCKER_IMAGE;
const DOCKER_MEMORY = process.env.DOCKER_MEMORY ?? "256m";
const CONTAINER = "athletics-memcheck";

const fileEnv = fs.existsSync(".env") ? dotenv.parse(fs.readFileSync(".env")) : {};
const env: NodeJS.ProcessEnv = {
  ...fileEnv,
  ...process.env,
  NODE_ENV: "production",
  PORT: String(PORT),
  NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=160",
};
const mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "athletics-media-"));
env.MEDIA_DIR = mediaDir;
env.STORAGE_DRIVER = "local";

/**
 * Следит за RSS процесса раз в секунду, не останавливая нагрузку: Linux — /proc, Windows — WorkingSet
 * из одного фонового PowerShell (запуск PowerShell на каждый замер тормозил бы сам замер).
 */
function watchRss(pid: number, onSample: (bytes: number) => void): () => void {
  if (DOCKER_IMAGE) {
    // PID 1 в контейнере — node start.cjs (сервер Next работает в том же процессе)
    const ps = spawn("docker", ["exec", CONTAINER, "sh", "-c", "while true; do grep VmRSS /proc/1/status; sleep 1; done"]);
    ps.stdout.on("data", (d) => {
      for (const m of String(d).matchAll(/VmRSS:\s+(\d+) kB/g)) onSample(Number(m[1]) * 1024);
    });
    return () => ps.kill();
  }
  if (process.platform === "linux") {
    const timer = setInterval(() => {
      const m = /VmRSS:\s+(\d+) kB/.exec(fs.readFileSync(`/proc/${pid}/status`, "utf8"));
      if (m) onSample(Number(m[1]) * 1024);
    }, 1000);
    return () => clearInterval(timer);
  }
  const ps = spawn("powershell", ["-NoProfile", "-Command", `while ($true) { (Get-Process -Id ${pid}).WorkingSet64; Start-Sleep -Milliseconds 1000 }`]);
  ps.stdout.on("data", (d) => {
    for (const line of String(d).split(/\r?\n/)) {
      const n = Number(line.trim());
      if (line.trim() && Number.isFinite(n) && n > 0) onSample(n);
    }
  });
  return () => ps.kill();
}

async function waitReady(): Promise<void> {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/robots.txt`);
      if (r.ok) return;
    } catch {
      // ещё не поднялся
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Сервер не поднялся за минуту.");
}

async function ownerCookie(): Promise<string> {
  const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  try {
    const owner = await db.owner.findUnique({ where: { id: "owner" }, select: { sessionVersion: true } });
    if (!owner) throw new Error("В базе нет аккаунта Владельца — импортируйте дамп или войдите в админку один раз.");
    const token = await signSession(env.AUTH_SECRET, { version: owner.sessionVersion, expiresAt: Date.now() + 3600_000 });
    return `${SESSION_COOKIE}=${token}`;
  } finally {
    await db.$disconnect();
  }
}

type Stats = { requests: number; errors: string[]; bytes: number };

async function hit(url: string, stats: Stats, init?: RequestInit, expect: (s: number) => boolean = (s) => s < 400): Promise<Response | null> {
  try {
    const r = await fetch(url.startsWith("http") ? url : `${BASE}${url}`, { redirect: "manual", ...init });
    const body = new Uint8Array(await r.arrayBuffer());
    stats.requests++;
    stats.bytes += body.byteLength;
    if (!expect(r.status)) stats.errors.push(`${init?.method ?? "GET"} ${url} → ${r.status}`);
    return r;
  } catch (e) {
    stats.errors.push(`${url}: ${(e as Error).message}`);
    return null;
  }
}

/** Адреса картинок и скриптов со страницы — их браузер тоже скачал бы. */
function assetsOf(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="(\/(?:_next\/static|_img)\/[^"]+)"/g)) urls.add(m[1].replace(/&amp;/g, "&"));
  for (const m of html.matchAll(/srcSet="([^"]+)"/g)) for (const part of m[1].split(",")) urls.add(part.trim().split(" ")[0].replace(/&amp;/g, "&"));
  return [...urls];
}

async function pool<T>(items: T[], fn: (item: T) => Promise<unknown>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

/** Сервер в Linux-контейнере: папка приложения и Фото подключаются томами, база — MariaDB на этой машине. */
function startDocker() {
  spawnSyncQuiet("docker", ["rm", "-f", CONTAINER]);
  const dbUrl = new URL(env.DATABASE_URL!);
  if (["localhost", "127.0.0.1"].includes(dbUrl.hostname)) dbUrl.hostname = "host.docker.internal";
  const pass = ["AUTH_SECRET", "ADMIN_LOGIN", "STORAGE_DRIVER", "NODE_OPTIONS", "NODE_ENV", "PORT"].flatMap((k) => (env[k] ? ["-e", `${k}=${env[k]}`] : []));
  return spawn("docker", [
    "run", "--name", CONTAINER, "--rm",
    `--memory=${DOCKER_MEMORY}`, `--memory-swap=${DOCKER_MEMORY}`, "--cpus=1",
    "-p", `${PORT}:${PORT}`,
    "-v", `${APP}:/app`, "-v", `${mediaDir}:/media`,
    "-e", `DATABASE_URL=${dbUrl.toString()}`, "-e", "MEDIA_DIR=/media", "-e", "HOSTNAME=0.0.0.0",
    ...pass,
    "-w", "/app", DOCKER_IMAGE!, "node", "start.cjs",
  ], { stdio: ["ignore", "ignore", "pipe"] });
}

function spawnSyncQuiet(cmd: string, args: string[]) {
  return spawnSync(cmd, args, { stdio: "ignore" });
}

async function main() {
  if (!fs.existsSync(path.join(APP, "start.cjs"))) throw new Error("Нет dist/hosting — сначала npm run build && node scripts/standalone/assemble.mjs");

  const server = DOCKER_IMAGE ? startDocker() : spawn(process.execPath, ["start.cjs"], { cwd: APP, env, stdio: ["ignore", "ignore", "pipe"] });
  let serverErrors = "";
  server.stderr.on("data", (d) => (serverErrors += String(d)));
  const samples: { t: number; rss: number }[] = [];
  const health: { rss: number; heapUsed: number; heapLimit: number }[] = [];
  const started = Date.now();
  let phase = "запуск";
  const byPhase: Record<string, number> = {};
  let stopWatch = () => {};
  const startWatch = () =>
    (stopWatch = watchRss(server.pid!, (rss) => {
      samples.push({ t: Date.now() - started, rss });
      byPhase[phase] = Math.max(byPhase[phase] ?? 0, rss);
    }));
  // Без Docker следим с запуска; в Docker — когда контейнер поднялся
  if (!DOCKER_IMAGE) startWatch();
  const latest = () => (samples.length ? samples[samples.length - 1].rss : 0);

  const stats: Stats = { requests: 0, errors: [], bytes: 0 };
  try {
    await waitReady();
    if (DOCKER_IMAGE) startWatch();
    await new Promise((r) => setTimeout(r, 2500));
    const idle = latest();
    phase = "нагрузка";
    const cookie = await ownerCookie();
    const auth = { headers: { cookie } };

    const pages = ["/ru", "/kk", "/ru/privacy", "/kk/privacy", "/ru/terms", "/kk/terms", "/robots.txt", "/sitemap.xml"];
    const previews = ["/ru/opengraph-image", "/kk/opengraph-image", "/ru/twitter-image", "/kk/twitter-image"];
    const admin = ["/admin", "/admin/photos", "/admin/site", "/admin/site/hero", "/admin/site/marquee", "/admin/tariffs", "/admin/trainers", "/admin/reviews", "/admin/directions", "/admin/account"];

    const assets = new Set<string>();
    for (const p of ["/ru", "/kk", "/admin/login"]) {
      const r = await fetch(`${BASE}${p}`);
      for (const a of assetsOf(await r.text())) assets.add(a);
    }

    // Фото для загрузки: сжатое, как из браузера, и две копии
    const photo = await sharp("public/stitch/hero.jpg").resize({ width: 1600 }).webp({ quality: 82 }).toBuffer();
    const w400 = await sharp(photo).resize({ width: 400 }).webp({ quality: 82 }).toBuffer();
    const w800 = await sharp(photo).resize({ width: 800 }).webp({ quality: 82 }).toBuffer();
    const uploaded: string[] = [];

    for (let round = 1; round <= ROUNDS; round++) {
      await pool(pages, (p) => hit(p, stats));
      await pool(previews, (p) => hit(p, stats));
      await pool([...assets], (a) => hit(a, stats));
      await pool(admin, (p) => hit(p, stats, auth, (s) => s === 200));
      await hit("/api/health", stats, auth, (s) => s === 200).then(async (r) => {
        if (!r) return;
        const h = await fetch(`${BASE}/api/health`, auth).then((x) => x.json() as Promise<{ memoryMb: { rss: number; heapUsed: number; heapLimit: number } }>);
        health.push(h.memoryMb);
      });
      // Счётчик Обращений
      await pool(Array.from({ length: 20 }, (_, i) => i), () =>
        hit("/api/contact", stats, { method: "POST", body: JSON.stringify({ channel: "whatsapp", source: "hero", locale: "ru" }) }, (s) => s === 204),
      );
      // Три Фото за круг: само Фото и копии, потом раздача
      for (let k = 0; k < 3; k++) {
        const base = `gallery/${crypto.randomUUID()}`;
        const files: [string, Buffer][] = [
          [`${base}.webp`, photo],
          [`${base}-w400.webp`, w400],
          [`${base}-w800.webp`, w800],
        ];
        for (const [rel, bytes] of files) {
          await hit(`/api/admin/media/${rel}`, stats, { method: "PUT", body: new Uint8Array(bytes), headers: { cookie, "content-type": "image/webp", origin: BASE } }, (s) => s === 201);
        }
        uploaded.push(`${base}.webp`);
      }
      await pool(uploaded.flatMap((u) => [`/media/${u}`, `/media/${u.replace(".webp", "-w400.webp")}`]), (u) => hit(u, stats));
      process.stdout.write(`круг ${round}/${ROUNDS}: запросов ${stats.requests}, ошибок ${stats.errors.length}, RSS ${(latest() / MB).toFixed(0)} МБ\n`);
    }

    // Простой после нагрузки: сколько памяти процесс отдаёт обратно
    phase = "простой";
    await new Promise((r) => setTimeout(r, 10_000));
    const after = latest();

    const rss = samples.filter((s) => s.t > 0).map((s) => s.rss).sort((a, b) => a - b);
    const pct = (p: number) => rss[Math.min(rss.length - 1, Math.floor((rss.length * p) / 100))];
    const heapMax = Math.max(...health.map((h) => h.heapUsed));
    console.log("\n=== Память standalone-сервера ===");
    console.log(
      DOCKER_IMAGE
        ? `Платформа: Docker ${DOCKER_IMAGE}, лимит памяти ${DOCKER_MEMORY} без подкачки, 1 CPU, NODE_OPTIONS=${env.NODE_OPTIONS}`
        : `Платформа: ${process.platform}, Node ${process.version}, NODE_OPTIONS=${env.NODE_OPTIONS}`,
    );
    console.log(`Запросов: ${stats.requests} (${(stats.bytes / MB).toFixed(0)} МБ ответов), Фото загружено: ${uploaded.length} (по 3 файла), ошибок: ${stats.errors.length}`);
    console.log(`RSS после запуска: ${idle ? (idle / MB).toFixed(0) : "?"} МБ`);
    console.log(`RSS под нагрузкой: медиана ${(pct(50) / MB).toFixed(0)} МБ, 95-й процентиль ${(pct(95) / MB).toFixed(0)} МБ, максимум ${(rss[rss.length - 1] / MB).toFixed(0)} МБ`);
    console.log(`RSS через 10 с после нагрузки: ${after ? (after / MB).toFixed(0) : "?"} МБ`);
    console.log(`Куча V8 (из /api/health): максимум ${heapMax} МБ при пределе ${health[0]?.heapLimit} МБ`);
    if (stats.errors.length) console.log("Ошибки:", [...new Set(stats.errors)].slice(0, 20));
    if (serverErrors.trim()) console.log("stderr сервера:", serverErrors.trim().split("\n").slice(-10).join("\n"));
  } finally {
    stopWatch();
    if (DOCKER_IMAGE) {
      const oom = spawnSync("docker", ["inspect", "-f", "{{.State.OOMKilled}}", CONTAINER], { encoding: "utf8" }).stdout.trim();
      if (oom === "true") console.log("Контейнер убит за превышение памяти (OOMKilled)!");
      spawnSyncQuiet("docker", ["rm", "-f", CONTAINER]);
    }
    server.kill();
    fs.rmSync(mediaDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error("Замер не удался:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
