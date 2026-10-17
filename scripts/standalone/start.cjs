// Файл запуска приложения в Plesk (Node.js → «Файл запуска приложения»), ADR 0004.
// Сначала миграции базы, потом сервер Next: новый код не отвечает на запросы, пока схема не обновлена.
// MIGRATE_ON_START=0 — не применять при запуске (тогда — вручную, `npm run db:migrate`).
"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Убирает файлы прежних сборок из .next/static и public/_img: выкатка Plesk из Git удалённые файлы не стирает.
 * Список файлов текущей сборки — build-files.txt (scripts/standalone/assemble.mjs). Ошибки уборки запуск не останавливают.
 */
function removeStaleBuildFiles() {
  const listFile = path.join(__dirname, "build-files.txt");
  if (!fs.existsSync(listFile)) return;
  const keep = new Set(fs.readFileSync(listFile, "utf8").split("\n").filter(Boolean));
  let removed = 0;
  const walk = (rel) => {
    const full = path.join(__dirname, rel);
    if (!fs.existsSync(full)) return;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (!keep.has(child)) {
        fs.unlinkSync(path.join(__dirname, child));
        removed++;
      }
    }
  };
  try {
    walk(".next/static");
    walk("public/_img");
    if (removed) console.log(`Убраны файлы прежних сборок: ${removed}.`);
  } catch (e) {
    console.error("Уборка файлов прежних сборок не удалась:", e && e.message);
  }
}

/** Версия кода для логов (ADR 0009): release.txt пишет сборка (assemble.mjs); переменная Plesk RELEASE главнее. */
function setRelease() {
  try {
    if (!process.env.RELEASE) process.env.RELEASE = fs.readFileSync(path.join(__dirname, "release.txt"), "utf8").trim();
  } catch {
    // нет файла — release будет «dev»
  }
}

async function main() {
  setRelease();
  removeStaleBuildFiles();
  if (process.env.MIGRATE_ON_START !== "0") {
    const { PrismaClient } = require("@prisma/client");
    const { migrate, singleConnectionUrl } = require("./migrate.cjs");
    const db = new PrismaClient({ datasourceUrl: singleConnectionUrl(process.env.DATABASE_URL) });
    try {
      await migrate({ db, dir: path.join(__dirname, "prisma", "migrations") });
    } finally {
      await db.$disconnect();
    }
  }
  require("./server.js");
}

main().catch((e) => {
  console.error("Запуск остановлен:", e && e.message ? e.message : e);
  process.exit(1);
});
